export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      empresas: {
        Row: {
          created_at: string
          id: string
          nome: string
        }
        Insert: {
          created_at?: string
          id?: string
          nome: string
        }
        Update: {
          created_at?: string
          id?: string
          nome?: string
        }
        Relationships: []
      }
      historico_revisoes: {
        Row: {
          created_at: string | null
          data_realizacao: string
          hora_realizacao: number | null
          id: string
          km_realizacao: number | null
          nota_fiscal_url: string | null
          observacoes: string | null
          oficina_id: string | null
          ordem_servico: string | null
          revisao_id: string | null
          tempo_servico_dias: number | null
          tipo_revisao_id: string
          valor: number | null
          veiculo_id: string
        }
        Insert: {
          created_at?: string | null
          data_realizacao?: string
          hora_realizacao?: number | null
          id?: string
          km_realizacao?: number | null
          nota_fiscal_url?: string | null
          observacoes?: string | null
          oficina_id?: string | null
          ordem_servico?: string | null
          revisao_id?: string | null
          tempo_servico_dias?: number | null
          tipo_revisao_id: string
          valor?: number | null
          veiculo_id: string
        }
        Update: {
          created_at?: string | null
          data_realizacao?: string
          hora_realizacao?: number | null
          id?: string
          km_realizacao?: number | null
          nota_fiscal_url?: string | null
          observacoes?: string | null
          oficina_id?: string | null
          ordem_servico?: string | null
          revisao_id?: string | null
          tempo_servico_dias?: number | null
          tipo_revisao_id?: string
          valor?: number | null
          veiculo_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "historico_revisoes_oficina_id_fkey"
            columns: ["oficina_id"]
            isOneToOne: false
            referencedRelation: "oficinas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "historico_revisoes_revisao_id_fkey"
            columns: ["revisao_id"]
            isOneToOne: false
            referencedRelation: "revisoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "historico_revisoes_tipo_revisao_id_fkey"
            columns: ["tipo_revisao_id"]
            isOneToOne: false
            referencedRelation: "tipos_revisao"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "historico_revisoes_veiculo_id_fkey"
            columns: ["veiculo_id"]
            isOneToOne: false
            referencedRelation: "veiculos"
            referencedColumns: ["id"]
          },
        ]
      }
      import_logs: {
        Row: {
          created_at: string
          errors: string[] | null
          filename: string
          id: string
          records_imported: number | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          errors?: string[] | null
          filename: string
          id?: string
          records_imported?: number | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          errors?: string[] | null
          filename?: string
          id?: string
          records_imported?: number | null
          user_id?: string | null
        }
        Relationships: []
      }
      oficinas: {
        Row: {
          created_at: string
          endereco: string | null
          id: string
          nome: string
          telefone: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          endereco?: string | null
          id?: string
          nome: string
          telefone?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          endereco?: string | null
          id?: string
          nome?: string
          telefone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          email: string | null
          id: string
          nome: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          id?: string
          nome?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: string
          nome?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      revisoes: {
        Row: {
          created_at: string
          data_revisao: string | null
          hora_revisao: number | null
          id: string
          intervalo: number
          km_revisao: number | null
          nota_fiscal_url: string | null
          observacoes: string | null
          oficina_id: string | null
          ordem_servico: string | null
          previsao_entrega: string | null
          status_execucao: Database["public"]["Enums"]["execution_status"]
          tipo_revisao_id: string
          unidade: Database["public"]["Enums"]["revision_unit"]
          updated_at: string
          valor: number | null
          veiculo_id: string
        }
        Insert: {
          created_at?: string
          data_revisao?: string | null
          hora_revisao?: number | null
          id?: string
          intervalo: number
          km_revisao?: number | null
          nota_fiscal_url?: string | null
          observacoes?: string | null
          oficina_id?: string | null
          ordem_servico?: string | null
          previsao_entrega?: string | null
          status_execucao?: Database["public"]["Enums"]["execution_status"]
          tipo_revisao_id: string
          unidade: Database["public"]["Enums"]["revision_unit"]
          updated_at?: string
          valor?: number | null
          veiculo_id: string
        }
        Update: {
          created_at?: string
          data_revisao?: string | null
          hora_revisao?: number | null
          id?: string
          intervalo?: number
          km_revisao?: number | null
          nota_fiscal_url?: string | null
          observacoes?: string | null
          oficina_id?: string | null
          ordem_servico?: string | null
          previsao_entrega?: string | null
          status_execucao?: Database["public"]["Enums"]["execution_status"]
          tipo_revisao_id?: string
          unidade?: Database["public"]["Enums"]["revision_unit"]
          updated_at?: string
          valor?: number | null
          veiculo_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "revisoes_oficina_id_fkey"
            columns: ["oficina_id"]
            isOneToOne: false
            referencedRelation: "oficinas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "revisoes_tipo_revisao_id_fkey"
            columns: ["tipo_revisao_id"]
            isOneToOne: false
            referencedRelation: "tipos_revisao"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "revisoes_veiculo_id_fkey"
            columns: ["veiculo_id"]
            isOneToOne: false
            referencedRelation: "veiculos"
            referencedColumns: ["id"]
          },
        ]
      }
      tipos_revisao: {
        Row: {
          created_at: string
          id: string
          intervalo_padrao: number | null
          nome: string
          unidade_padrao: Database["public"]["Enums"]["revision_unit"] | null
        }
        Insert: {
          created_at?: string
          id?: string
          intervalo_padrao?: number | null
          nome: string
          unidade_padrao?: Database["public"]["Enums"]["revision_unit"] | null
        }
        Update: {
          created_at?: string
          id?: string
          intervalo_padrao?: number | null
          nome?: string
          unidade_padrao?: Database["public"]["Enums"]["revision_unit"] | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      veiculos: {
        Row: {
          created_at: string
          crlv_url: string | null
          crlv_validade: string | null
          documento_url: string | null
          empresa_id: string | null
          hora_atual: number | null
          id: string
          km_atual: number | null
          placa_serie: string
          retorno_patio: string | null
          tacografo_url: string | null
          tacografo_validade: string | null
          tag_obra: string | null
          ultima_atualizacao: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          crlv_url?: string | null
          crlv_validade?: string | null
          documento_url?: string | null
          empresa_id?: string | null
          hora_atual?: number | null
          id?: string
          km_atual?: number | null
          placa_serie: string
          retorno_patio?: string | null
          tacografo_url?: string | null
          tacografo_validade?: string | null
          tag_obra?: string | null
          ultima_atualizacao?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          crlv_url?: string | null
          crlv_validade?: string | null
          documento_url?: string | null
          empresa_id?: string | null
          hora_atual?: number | null
          id?: string
          km_atual?: number | null
          placa_serie?: string
          retorno_patio?: string | null
          tacografo_url?: string | null
          tacografo_validade?: string | null
          tag_obra?: string | null
          ultima_atualizacao?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "veiculos_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "user"
      execution_status: "nao_realizada" | "em_servico" | "realizada"
      revision_unit: "Km" | "Hr"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

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
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
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
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
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
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
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
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
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
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "user"],
      execution_status: ["nao_realizada", "em_servico", "realizada"],
      revision_unit: ["Km", "Hr"],
    },
  },
} as const
