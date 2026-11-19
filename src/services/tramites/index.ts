export {
  createTramiteAlumno,
  deleteTramiteAlumno,
  fetchCatalogosParaTramites,
  fetchTramitesAlumnos,
  updateEstadoTramiteAlumno,
  updateTramiteAlumno,
  type FetchTramitesOptions,
  type TramitesCatalogosSnapshot,
} from './tramites.service'

export {
  mapTramiteFromDb,
  summarizeTramitesByEstado,
  validateTramiteAlumnoInput,
  type EstadoTramiteAlumno,
  type NivelEducativo,
  type TramiteAlumnoInput,
  type TramiteAlumnoRecord,
  type TramiteJoinedDbRow,
} from './tramitesValidation'
