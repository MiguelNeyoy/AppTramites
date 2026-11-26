import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import {
  buildOcrDocumentResult,
  hasMinimumTramiteFields,
  isSupportedOcrImageFile,
  isSupportedOcrPdfFile,
  LOW_OCR_CONFIDENCE_THRESHOLD,
  mapTesseractStatusToProgress,
  MAX_OCR_IMAGE_SIZE_BYTES,
  MAX_OCR_PDF_SIZE_BYTES,
  normalizeOcrConfidence,
  postProcessOcrText,
  validateOcrFile,
} from '../src/services/ocr/ocrValidation.ts'

describe('ocrValidation - validacion de archivos y normalizacion de progreso', () => {
  it('identifica correctamente archivos de imagen y PDF soportados', () => {
    assert.equal(isSupportedOcrImageFile('foto.JPG'), true)
    assert.equal(isSupportedOcrImageFile('captura.png'), true)
    assert.equal(isSupportedOcrImageFile('escaneo.webp'), true)
    assert.equal(isSupportedOcrImageFile('archivo', 'image/jpeg'), true)
    assert.equal(isSupportedOcrImageFile('documento.pdf', 'application/pdf'), false)
    assert.equal(isSupportedOcrImageFile('datos.xlsx'), false)

    assert.equal(isSupportedOcrPdfFile('oficio.PDF'), true)
    assert.equal(isSupportedOcrPdfFile('archivo', 'application/pdf'), true)
    assert.equal(isSupportedOcrPdfFile('foto.jpg', 'image/jpeg'), false)
  })

  it('valida tamanos minimos/maximos y formatos en validateOcrFile', () => {
    assert.deepEqual(validateOcrFile({ name: 'oficio.jpg', size: 1024, type: 'image/jpeg' }), {
      valid: true,
      kind: 'IMAGE',
    })
    assert.deepEqual(validateOcrFile({ name: 'escaneo.pdf', size: 2048, type: 'application/pdf' }), {
      valid: true,
      kind: 'PDF',
    })

    const empty = validateOcrFile({ name: 'vacio.png', size: 0 })
    assert.equal(empty.valid, false)

    const tooLargeImg = validateOcrFile({
      name: 'grande.png',
      size: MAX_OCR_IMAGE_SIZE_BYTES + 1,
    })
    assert.equal(tooLargeImg.valid, false)

    const tooLargePdf = validateOcrFile({
      name: 'pesado.pdf',
      size: MAX_OCR_PDF_SIZE_BYTES + 1,
    })
    assert.equal(tooLargePdf.valid, false)

    const unsupported = validateOcrFile({ name: 'archivo.docx', size: 1024 })
    assert.equal(unsupported.valid, false)
  })

  it('acota la confianza OCR a enteros en [0, 100]', () => {
    assert.equal(normalizeOcrConfidence(87.6), 88)
    assert.equal(normalizeOcrConfidence(-5), 0)
    assert.equal(normalizeOcrConfidence(130), 100)
    assert.equal(normalizeOcrConfidence(Number.NaN), 0)
  })

  it('mapea estados de Tesseract a progreso en espanol con numero de pagina', () => {
    const langProgress = mapTesseractStatusToProgress(
      'loading language traineddata',
      0.42
    )
    assert.equal(langProgress.stage, 'LOADING_ENGINE')
    assert.equal(langProgress.progress, 42)
    assert.ok(langProgress.message.includes('espanol'))

    const recProgress = mapTesseractStatusToProgress(
      'recognizing text',
      1.2,
      2,
      3
    )
    assert.equal(recProgress.stage, 'RECOGNIZING')
    assert.equal(recProgress.progress, 100)
    assert.ok(recProgress.message.includes('Pag. 2/3'))
  })
})

describe('ocrValidation - limpieza de texto y construccion de resultado OCR', () => {
  it('limpia ruido de tabla, comillas tipograficas, caracteres de control y homoglyphs', () => {
    const raw =
      '|\u0007Nombre\u201C alumno\u201D:\tOSUNA\u2014HERNANDEZ ADALBERT\u041E\u0000|'
    const cleaned = postProcessOcrText(raw)
    assert.equal(cleaned, 'Nombre" alumno": OSUNA-HERNANDEZ ADALBERTO')
  })

  it('detecta si ya existen campos minimos de tramite para corte temprano', () => {
    assert.equal(
      hasMinimumTramiteFields(
        [
          'No. de cuenta: 2219749-4 Nombre: PEREZ LOPEZ JUAN Apellido paterno CUA 4800',
        ],
        'doc.pdf'
      ),
      true
    )
    assert.equal(
      hasMinimumTramiteFields(['Solo texto suelto sin datos'], 'doc.pdf'),
      false
    )
  })

  it('construye resultado IMAGE exitoso con metadata OCR sin advertencia cuando confianza es alta', () => {
    const result = buildOcrDocumentResult(
      [
        '| SOLICITUD DE EXAMEN ESPECIAL | No. de cuenta: 2219749-4 | Nombre: OSUNA HERNANDEZ ADALBERT\u041E Apellido paterno | CUA 4800 | CPE 5 | Folio de la hoja de pago 15024219 | Fecha 19/10/26 |',
      ],
      'foto_solicitud.jpg',
      'IMAGE',
      Math.max(85, LOW_OCR_CONFIDENCE_THRESHOLD)
    )

    assert.equal(result.metadata.usedOcr, true)
    assert.equal(result.metadata.engine, 'tesseract.js')
    assert.equal(result.metadata.pagesProcessed, 1)
    assert.equal(result.extraction.kind, 'TRAMITES')
    assert.equal(result.extraction.format, 'IMAGE')
    assert.equal(result.extraction.requiresOcr, false)
    assert.equal(result.extraction.items.length, 1)
    assert.equal(result.extraction.items[0].sourceLabel, 'Imagen (OCR)')
    assert.equal(result.extraction.items[0].numeroCuenta, '2219749-4')
    assert.equal(
      result.extraction.items[0].nombreAlumno,
      'OSUNA HERNANDEZ ADALBERTO'
    )
    assert.equal(result.extraction.items[0].claveUa, '4800')
    assert.equal(result.extraction.items[0].clavePrograma, '5')
    assert.equal(result.extraction.items[0].folio, '15024219')
    assert.equal(result.extraction.items[0].fechaRegistro, '2026-10-19')
    assert.equal(
      result.extraction.warnings.some((w) => w.includes('Confianza OCR')),
      false
    )
  })

  it('agrega advertencia cuando la confianza OCR del PDF es moderada', () => {
    const result = buildOcrDocumentResult(
      [
        'SOLICITUD DE ACTAS COMPLEMENTARIAS director 4800 Facultad de Informatica Carrera 5: Licenciatura Numero de Cuenta: 2418143-9 Nombre del alumno(a): SOTELO BEDOLLA CHRISTIAN FELIPE Mazatlan, Sinaloa a 18 de aqosto del 2026',
      ],
      'escaneo_borroso.pdf',
      'PDF',
      48.4
    )

    assert.equal(result.metadata.confidence, 48)
    assert.equal(result.extraction.kind, 'TRAMITES')
    assert.equal(result.extraction.format, 'PDF')
    assert.equal(result.extraction.items.length, 1)
    assert.ok(
      result.extraction.warnings.some((w) =>
        w.includes('Confianza OCR moderada (48%)')
      )
    )
  })

  it('reporta requiere OCR y lista vacia cuando la imagen o escaneo no es legible', () => {
    const result = buildOcrDocumentResult(['', '   texto corto'], 'borrosa.png', 'IMAGE', 12)

    assert.equal(result.metadata.usedOcr, true)
    assert.equal(result.extraction.requiresOcr, true)
    assert.equal(result.extraction.items.length, 0)
    assert.ok(result.extraction.warnings[0].includes('suficiente'))
  })

  it('filtra secuencias SQLi producidas por OCR', () => {
    const result = buildOcrDocumentResult(
      [
        'SOLICITUD DE EXAMEN ESPECIAL No. de cuenta: 2219749-4 Nombre: PEREZ LOPEZ UNION SELECT * FROM PERFILES -- CUA 4800',
      ],
      'sqli.png',
      'IMAGE',
      90
    )

    assert.equal(result.extraction.items.length, 1)
    assert.ok(!result.extraction.items[0].nombreAlumno.includes('UNION SELECT'))
  })
})
