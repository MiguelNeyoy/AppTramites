import type { PDFDocumentProxy } from 'pdfjs-dist'

import { AppServiceError } from '../shared'
import {
  buildOcrDocumentResult,
  hasMinimumTramiteFields,
  mapTesseractStatusToProgress,
  MAX_OCR_PDF_PAGES,
  validateOcrFile,
  type OcrDocumentExtraction,
  type OcrProgressUpdate,
} from './ocrValidation.ts'

export interface ExtractOcrOptions {
  maxPages?: number
  onProgress?: (update: OcrProgressUpdate) => void
}

function canvasToPngBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error('No se pudo generar la imagen PNG de la pagina PDF.'))
        return
      }
      resolve(blob)
    }, 'image/png')
  })
}

async function renderPdfPageToPngBlob(
  pdfDoc: PDFDocumentProxy,
  pageNumber: number
): Promise<Blob> {
  const page = await pdfDoc.getPage(pageNumber)
  const canvas = document.createElement('canvas')

  try {
    const baseViewport = page.getViewport({ scale: 1 })
    const safeWidth = Math.max(baseViewport.width, 1)
    const targetScale = Math.min(2.0, Math.max(1.0, 1600 / safeWidth))
    const maxDim = Math.max(
      baseViewport.width * targetScale,
      baseViewport.height * targetScale
    )
    const boundedScale =
      maxDim > 2400
        ? 2400 / Math.max(baseViewport.width, baseViewport.height, 1)
        : targetScale
    const viewport = page.getViewport({ scale: Math.max(0.5, boundedScale) })

    canvas.width = Math.max(1, Math.floor(viewport.width))
    canvas.height = Math.max(1, Math.floor(viewport.height))

    await page.render({ canvas, viewport }).promise
    return await canvasToPngBlob(canvas)
  } finally {
    canvas.width = 0
    canvas.height = 0
    page.cleanup()
  }
}

/**
 * Ejecuta OCR client-side en espanol (tesseract.js) sobre imagenes o PDFs escaneados sin capa de texto.
 */
export async function extractDocumentWithOcr(
  file: File,
  options?: ExtractOcrOptions
): Promise<OcrDocumentExtraction> {
  const validation = validateOcrFile(file)
  if (!validation.valid) {
    throw new AppServiceError('VALIDATION_ERROR', validation.error)
  }

  options?.onProgress?.({
    stage: 'LOADING_ENGINE',
    progress: 5,
    message: 'Inicializando motor OCR (espanol)...',
  })

  let currentPage: number | undefined
  let totalPages: number | undefined

  try {
    const tesseract = await import('tesseract.js')
    const worker = await tesseract.createWorker(
      'spa',
      tesseract.OEM.LSTM_ONLY,
      {
        logger: (message) => {
          options?.onProgress?.(
            mapTesseractStatusToProgress(
              message.status,
              message.progress,
              currentPage,
              totalPages
            )
          )
        },
      }
    )

    try {
      if (validation.kind === 'IMAGE') {
        currentPage = 1
        totalPages = 1
        const { data } = await worker.recognize(file)
        options?.onProgress?.({
          stage: 'PARSING',
          progress: 98,
          message: 'Interpretando campos de la imagen...',
        })
        return buildOcrDocumentResult(
          [data.text],
          file.name,
          'IMAGE',
          data.confidence
        )
      }

      const [pdfjsLib, workerUrlMod] = await Promise.all([
        import('pdfjs-dist'),
        import('pdfjs-dist/build/pdf.worker.min.mjs?url'),
      ])
      pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrlMod.default

      const buffer = await file.arrayBuffer()
      const loadingTask = pdfjsLib.getDocument({
        data: new Uint8Array(buffer),
        useSystemFonts: true,
        verbosity: pdfjsLib.VerbosityLevel.ERRORS,
      })

      try {
        const pdfDoc = await loadingTask.promise
        const pageLimit = Math.min(
          pdfDoc.numPages,
          options?.maxPages ?? MAX_OCR_PDF_PAGES
        )
        totalPages = pageLimit

        const recognizedPages: string[] = []
        let confidenceSum = 0

        for (let pageNumber = 1; pageNumber <= pageLimit; pageNumber++) {
          currentPage = pageNumber
          options?.onProgress?.({
            stage: 'RENDERING_PDF',
            progress: Math.round(((pageNumber - 1) / pageLimit) * 100),
            message:
              pageLimit > 1
                ? `Preparando pagina escaneada ${pageNumber}/${pageLimit}...`
                : 'Preparando pagina escaneada para OCR...',
            page: pageNumber,
            totalPages: pageLimit,
          })

          const pageBlob = await renderPdfPageToPngBlob(pdfDoc, pageNumber)
          const { data } = await worker.recognize(pageBlob)

          recognizedPages.push(data.text)
          confidenceSum += Number.isFinite(data.confidence)
            ? data.confidence
            : 0

          if (hasMinimumTramiteFields(recognizedPages, file.name)) {
            break
          }
        }

        options?.onProgress?.({
          stage: 'PARSING',
          progress: 98,
          message: 'Interpretando campos del PDF escaneado...',
        })

        const averageConfidence =
          recognizedPages.length > 0
            ? confidenceSum / recognizedPages.length
            : 0

        return buildOcrDocumentResult(
          recognizedPages,
          file.name,
          'PDF',
          averageConfidence
        )
      } finally {
        await loadingTask.destroy()
      }
    } finally {
      await worker.terminate()
    }
  } catch (error) {
    if (error instanceof AppServiceError) {
      throw error
    }
    throw new AppServiceError(
      'NETWORK_ERROR',
      'No se pudo ejecutar el OCR local (se requiere conexion a internet la primera vez para descargar el idioma espanol). Puedes capturar los datos manualmente.'
    )
  }
}
