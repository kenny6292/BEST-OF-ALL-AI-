export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: { id: string; display_name: string | null; avatar_url: string | null; created_at: string; updated_at: string };
        Insert: { id: string; display_name?: string | null; avatar_url?: string | null; created_at?: string; updated_at?: string };
        Update: { id?: string; display_name?: string | null; avatar_url?: string | null; updated_at?: string };
        Relationships: [];
      };
      conversations: {
        Row: { id: string; user_id: string; title: string; model: string | null; created_at: string; updated_at: string };
        Insert: { id?: string; user_id: string; title?: string; model?: string | null; created_at?: string; updated_at?: string };
        Update: { title?: string; model?: string | null; updated_at?: string };
        Relationships: [];
      };
      messages: {
        Row: { id: string; conversation_id: string; user_id: string; role: string; content: string; model: string | null; created_at: string };
        Insert: { id?: string; conversation_id: string; user_id: string; role: string; content: string; model?: string | null; created_at?: string };
        Update: { content?: string };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};

export type Tables<T extends keyof Database["public"]["Tables"]> = Database["public"]["Tables"][T]["Row"];
