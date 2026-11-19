// Regenerado desde PostgreSQL/Supabase (Issue #10)

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  
  "public": {
          Tables: {
            "checklists_actas": {
                  Row: {
                    "actualizado_por": string | null,"estado": Database["public"]['Enums']["estado_acta"],"id": string,"periodo_id": number,"programa_id": number,"tipo_acta": Database["public"]['Enums']["tipo_acta"],"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "actualizado_por"?: string | null,"estado"?: Database["public"]['Enums']["estado_acta"],"id"?: string,"periodo_id": number,"programa_id": number,"tipo_acta": Database["public"]['Enums']["tipo_acta"],"updated_at"?: string
                  }
                  Update: {
                    "actualizado_por"?: string | null,"estado"?: Database["public"]['Enums']["estado_acta"],"id"?: string,"periodo_id"?: number,"programa_id"?: number,"tipo_acta"?: Database["public"]['Enums']["tipo_acta"],"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "checklists_actas_actualizado_por_fkey"
      columns: ["actualizado_por"]
isOneToOne: false
      referencedRelation: "perfiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "checklists_actas_periodo_id_fkey"
      columns: ["periodo_id"]
isOneToOne: false
      referencedRelation: "periodos_escolares"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "checklists_actas_programa_id_fkey"
      columns: ["programa_id"]
isOneToOne: false
      referencedRelation: "programas_educativos"
      referencedColumns: ["id"]
    }
                  ]
                },"fichas_nuevo_ingreso": {
                  Row: {
                    "a_materno": string,"a_paterno": string,"celular": string,"correo": string,"created_at": string,"curp": string,"estatus_ficha": Database["public"]['Enums']["estatus_ficha_nuevo_ingreso"],"fecha_nacimiento": string,"fecha_registro": string,"id": string,"nombre": string,"periodo_id": number,"programa_id": number,"sexo": number,"unidad_academica_id": number,"updated_at": string,"usuario_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "a_materno"?: string,"a_paterno": string,"celular": string,"correo": string,"created_at"?: string,"curp": string,"estatus_ficha"?: Database["public"]['Enums']["estatus_ficha_nuevo_ingreso"],"fecha_nacimiento": string,"fecha_registro"?: string,"id"?: string,"nombre": string,"periodo_id": number,"programa_id": number,"sexo": number,"unidad_academica_id": number,"updated_at"?: string,"usuario_id"?: string
                  }
                  Update: {
                    "a_materno"?: string,"a_paterno"?: string,"celular"?: string,"correo"?: string,"created_at"?: string,"curp"?: string,"estatus_ficha"?: Database["public"]['Enums']["estatus_ficha_nuevo_ingreso"],"fecha_nacimiento"?: string,"fecha_registro"?: string,"id"?: string,"nombre"?: string,"periodo_id"?: number,"programa_id"?: number,"sexo"?: number,"unidad_academica_id"?: number,"updated_at"?: string,"usuario_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "fichas_nuevo_ingreso_periodo_id_fkey"
      columns: ["periodo_id"]
isOneToOne: false
      referencedRelation: "periodos_escolares"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fichas_nuevo_ingreso_programa_id_fkey"
      columns: ["programa_id"]
isOneToOne: false
      referencedRelation: "programas_educativos"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fichas_nuevo_ingreso_unidad_academica_id_fkey"
      columns: ["unidad_academica_id"]
isOneToOne: false
      referencedRelation: "unidades_academicas"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fichas_nuevo_ingreso_usuario_id_fkey"
      columns: ["usuario_id"]
isOneToOne: false
      referencedRelation: "perfiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fk_fichas_unidad_programa"
      columns: ["unidad_academica_id","programa_id"]
isOneToOne: false
      referencedRelation: "programas_educativos"
      referencedColumns: ["unidad_academica_id","id"]
    }
                  ]
                },"perfiles": {
                  Row: {
                    "activo": boolean,"created_at": string,"email": string,"id": string,"nombre": string,"rol": Database["public"]['Enums']["rol_usuario"],"unidad_academica_id": number | null,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "activo"?: boolean,"created_at"?: string,"email": string,"id": string,"nombre": string,"rol"?: Database["public"]['Enums']["rol_usuario"],"unidad_academica_id"?: number | null,"updated_at"?: string
                  }
                  Update: {
                    "activo"?: boolean,"created_at"?: string,"email"?: string,"id"?: string,"nombre"?: string,"rol"?: Database["public"]['Enums']["rol_usuario"],"unidad_academica_id"?: number | null,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "perfiles_unidad_academica_id_fkey"
      columns: ["unidad_academica_id"]
isOneToOne: false
      referencedRelation: "unidades_academicas"
      referencedColumns: ["id"]
    }
                  ]
                },"periodos_escolares": {
                  Row: {
                    "activo": boolean,"created_at": string,"fecha_fin": string,"fecha_inicio": string,"id": number,"nombre": string,"numero_periodo": number
                  }
                  ComputedFields: never
                  Insert: {
                    "activo"?: boolean,"created_at"?: string,"fecha_fin": string,"fecha_inicio": string,"id"?: number,"nombre": string,"numero_periodo": number
                  }
                  Update: {
                    "activo"?: boolean,"created_at"?: string,"fecha_fin"?: string,"fecha_inicio"?: string,"id"?: number,"nombre"?: string,"numero_periodo"?: number
                  }
                  Relationships: [
                    
                  ]
                },"programas_educativos": {
                  Row: {
                    "activo": boolean,"clave_programa": string,"created_at": string,"id": number,"nombre": string,"unidad_academica_id": number
                  }
                  ComputedFields: never
                  Insert: {
                    "activo"?: boolean,"clave_programa": string,"created_at"?: string,"id"?: number,"nombre": string,"unidad_academica_id": number
                  }
                  Update: {
                    "activo"?: boolean,"clave_programa"?: string,"created_at"?: string,"id"?: number,"nombre"?: string,"unidad_academica_id"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "programas_educativos_unidad_academica_id_fkey"
      columns: ["unidad_academica_id"]
isOneToOne: false
      referencedRelation: "unidades_academicas"
      referencedColumns: ["id"]
    }
                  ]
                },"seguimientos_tramite": {
                  Row: {
                    "archivo_pdf_url": string | null,"cantidad_con_error": number,"cantidad_enviadas": number,"cantidad_pendientes": number,"cantidad_resueltas": number,"created_at": string,"fecha_corte": string,"id": string,"observaciones": string | null,"periodo_id": number,"programa_id": number,"tipo_tramite_id": number,"updated_at": string,"usuario_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "archivo_pdf_url"?: string | null,"cantidad_con_error"?: number,"cantidad_enviadas"?: number,"cantidad_pendientes"?: number,"cantidad_resueltas"?: number,"created_at"?: string,"fecha_corte": string,"id"?: string,"observaciones"?: string | null,"periodo_id": number,"programa_id": number,"tipo_tramite_id": number,"updated_at"?: string,"usuario_id": string
                  }
                  Update: {
                    "archivo_pdf_url"?: string | null,"cantidad_con_error"?: number,"cantidad_enviadas"?: number,"cantidad_pendientes"?: number,"cantidad_resueltas"?: number,"created_at"?: string,"fecha_corte"?: string,"id"?: string,"observaciones"?: string | null,"periodo_id"?: number,"programa_id"?: number,"tipo_tramite_id"?: number,"updated_at"?: string,"usuario_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "seguimientos_tramite_periodo_id_fkey"
      columns: ["periodo_id"]
isOneToOne: false
      referencedRelation: "periodos_escolares"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "seguimientos_tramite_programa_id_fkey"
      columns: ["programa_id"]
isOneToOne: false
      referencedRelation: "programas_educativos"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "seguimientos_tramite_tipo_tramite_id_fkey"
      columns: ["tipo_tramite_id"]
isOneToOne: false
      referencedRelation: "tipos_tramite"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "seguimientos_tramite_usuario_id_fkey"
      columns: ["usuario_id"]
isOneToOne: false
      referencedRelation: "perfiles"
      referencedColumns: ["id"]
    }
                  ]
                },"tipos_tramite": {
                  Row: {
                    "activo": boolean,"created_at": string,"id": number,"modulo": Database["public"]['Enums']["modulo_tramite"],"nombre": string,"permite_pdf": boolean
                  }
                  ComputedFields: never
                  Insert: {
                    "activo"?: boolean,"created_at"?: string,"id"?: number,"modulo"?: Database["public"]['Enums']["modulo_tramite"],"nombre": string,"permite_pdf"?: boolean
                  }
                  Update: {
                    "activo"?: boolean,"created_at"?: string,"id"?: number,"modulo"?: Database["public"]['Enums']["modulo_tramite"],"nombre"?: string,"permite_pdf"?: boolean
                  }
                  Relationships: [
                    
                  ]
                },"tramites_alumnos": {
                  Row: {
                    "archivo_pdf_url": string | null,"created_at": string,"estado": Database["public"]['Enums']["estado_tramite_alumno"],"fecha_registro": string,"folio": number,"id": string,"nombre_alumno": string,"numero_cuenta": string,"observaciones": string | null,"periodo_id": number,"programa_id": number,"tipo_tramite_id": number,"updated_at": string,"usuario_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "archivo_pdf_url"?: string | null,"created_at"?: string,"estado"?: Database["public"]['Enums']["estado_tramite_alumno"],"fecha_registro"?: string,"folio"?: never,"id"?: string,"nombre_alumno": string,"numero_cuenta": string,"observaciones"?: string | null,"periodo_id": number,"programa_id": number,"tipo_tramite_id": number,"updated_at"?: string,"usuario_id"?: string
                  }
                  Update: {
                    "archivo_pdf_url"?: string | null,"created_at"?: string,"estado"?: Database["public"]['Enums']["estado_tramite_alumno"],"fecha_registro"?: string,"folio"?: never,"id"?: string,"nombre_alumno"?: string,"numero_cuenta"?: string,"observaciones"?: string | null,"periodo_id"?: number,"programa_id"?: number,"tipo_tramite_id"?: number,"updated_at"?: string,"usuario_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "tramites_alumnos_periodo_id_fkey"
      columns: ["periodo_id"]
isOneToOne: false
      referencedRelation: "periodos_escolares"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "tramites_alumnos_programa_id_fkey"
      columns: ["programa_id"]
isOneToOne: false
      referencedRelation: "programas_educativos"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "tramites_alumnos_tipo_tramite_id_fkey"
      columns: ["tipo_tramite_id"]
isOneToOne: false
      referencedRelation: "tipos_tramite"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "tramites_alumnos_usuario_id_fkey"
      columns: ["usuario_id"]
isOneToOne: false
      referencedRelation: "perfiles"
      referencedColumns: ["id"]
    }
                  ]
                },"unidades_academicas": {
                  Row: {
                    "activa": boolean,"clave_ua": string,"created_at": string,"id": number,"nivel": Database["public"]['Enums']["nivel_educativo"],"nombre": string
                  }
                  ComputedFields: never
                  Insert: {
                    "activa"?: boolean,"clave_ua": string,"created_at"?: string,"id"?: number,"nivel": Database["public"]['Enums']["nivel_educativo"],"nombre": string
                  }
                  Update: {
                    "activa"?: boolean,"clave_ua"?: string,"created_at"?: string,"id"?: number,"nivel"?: Database["public"]['Enums']["nivel_educativo"],"nombre"?: string
                  }
                  Relationships: [
                    
                  ]
                }
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "admin_delete_usuario":
{ Args: { "p_user_id": string }; Returns: undefined
                           },
"admin_update_usuario":
{ Args: { "p_activo": boolean,"p_email": string,"p_nombre": string,"p_rol": Database["public"]['Enums']["rol_usuario"],"p_unidad_academica_id"?: number,"p_user_id": string }; Returns: {
              "activo": boolean,
"created_at": string,
"email": string,
"id": string,
"nombre": string,
"rol": Database["public"]['Enums']["rol_usuario"],
"unidad_academica_id": number | null,
"updated_at": string
            }
                          SetofOptions: {
        from: "*"
        to: "perfiles"
        isOneToOne: true
        isSetofReturn: false
      } },
"current_user_role":
{ Args: Record<PropertyKey, never>; Returns: Database["public"]['Enums']["rol_usuario"]
                           },
"current_user_unidad_academica_id":
{ Args: Record<PropertyKey, never>; Returns: number
                           }
          }
          Enums: {
            "estado_acta": "PENDIENTE"|"GENERADA"|"NO_APLICA","estado_tramite_alumno": "PENDIENTE"|"RESUELTO"|"CON_ERROR","estatus_ficha_nuevo_ingreso": "SIN_PROCESO"|"SIN_PAGO"|"FICHA_VENCIDA"|"FICHA_CANCELADA","modulo_tramite": "TRAMITES_GENERALES"|"NUEVO_INGRESO","nivel_educativo": "LICENCIATURA"|"BACHILLERATO","rol_usuario": "ADMIN"|"LICENCIATURA"|"BACHILLERATO"|"NUEVO_INGRESO"|"UNIDAD_ACADEMICA","tipo_acta": "ORDINARIA"|"EXTRAORDINARIA"|"REGULARIZACION"
          }
          CompositeTypes: {
            [_ in never]: never
          }
        }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
      Row: infer R
    }
    ? R
    : never
  : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
      Insert: infer I
    }
    ? I
    : never
  : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
      Update: infer U
    }
    ? U
    : never
  : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
  ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
  : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never

export const Constants = {
  "public": {
          Enums: {
            "estado_acta": ["PENDIENTE", "GENERADA", "NO_APLICA"],"estado_tramite_alumno": ["PENDIENTE", "RESUELTO", "CON_ERROR"],"estatus_ficha_nuevo_ingreso": ["SIN_PROCESO", "SIN_PAGO", "FICHA_VENCIDA", "FICHA_CANCELADA"],"modulo_tramite": ["TRAMITES_GENERALES", "NUEVO_INGRESO"],"nivel_educativo": ["LICENCIATURA", "BACHILLERATO"],"rol_usuario": ["ADMIN", "LICENCIATURA", "BACHILLERATO", "NUEVO_INGRESO", "UNIDAD_ACADEMICA"],"tipo_acta": ["ORDINARIA", "EXTRAORDINARIA", "REGULARIZACION"]
          }
        }
} as const
