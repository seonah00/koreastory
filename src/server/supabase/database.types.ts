export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5";
  };
  public: {
    Tables: {
      assets: {
        Row: {
          approved_at: string | null;
          approved_by: string | null;
          bytes: number | null;
          checksum_sha256: string | null;
          created_at: string;
          episode_id: string | null;
          id: string;
          kind: Database["public"]["Enums"]["asset_kind"];
          metadata: Json;
          mime_type: string | null;
          status: Database["public"]["Enums"]["approval_status"];
          storage_bucket: string;
          storage_path: string;
          workspace_id: string;
        };
        Insert: {
          approved_at?: string | null;
          approved_by?: string | null;
          bytes?: number | null;
          checksum_sha256?: string | null;
          created_at?: string;
          episode_id?: string | null;
          id?: string;
          kind: Database["public"]["Enums"]["asset_kind"];
          metadata?: Json;
          mime_type?: string | null;
          status?: Database["public"]["Enums"]["approval_status"];
          storage_bucket?: string;
          storage_path: string;
          workspace_id: string;
        };
        Update: {
          approved_at?: string | null;
          approved_by?: string | null;
          bytes?: number | null;
          checksum_sha256?: string | null;
          created_at?: string;
          episode_id?: string | null;
          id?: string;
          kind?: Database["public"]["Enums"]["asset_kind"];
          metadata?: Json;
          mime_type?: string | null;
          status?: Database["public"]["Enums"]["approval_status"];
          storage_bucket?: string;
          storage_path?: string;
          workspace_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "assets_episode_id_fkey";
            columns: ["episode_id"];
            isOneToOne: false;
            referencedRelation: "episodes";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "assets_workspace_id_fkey";
            columns: ["workspace_id"];
            isOneToOne: false;
            referencedRelation: "workspaces";
            referencedColumns: ["id"];
          },
        ];
      };
      bible_entries: {
        Row: {
          approved_at: string | null;
          approved_by: string | null;
          content: Json;
          created_at: string;
          id: string;
          kind: string;
          name: string;
          slug: string;
          status: Database["public"]["Enums"]["approval_status"];
          version: number;
          workspace_id: string;
        };
        Insert: {
          approved_at?: string | null;
          approved_by?: string | null;
          content?: Json;
          created_at?: string;
          id?: string;
          kind: string;
          name: string;
          slug: string;
          status?: Database["public"]["Enums"]["approval_status"];
          version?: number;
          workspace_id: string;
        };
        Update: {
          approved_at?: string | null;
          approved_by?: string | null;
          content?: Json;
          created_at?: string;
          id?: string;
          kind?: string;
          name?: string;
          slug?: string;
          status?: Database["public"]["Enums"]["approval_status"];
          version?: number;
          workspace_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "bible_entries_workspace_id_fkey";
            columns: ["workspace_id"];
            isOneToOne: false;
            referencedRelation: "workspaces";
            referencedColumns: ["id"];
          },
        ];
      };
      bible_references: {
        Row: {
          asset_id: string | null;
          bible_entry_id: string;
          created_at: string;
          id: string;
          label: string | null;
          position: number;
          workspace_id: string;
        };
        Insert: {
          asset_id?: string | null;
          bible_entry_id: string;
          created_at?: string;
          id?: string;
          label?: string | null;
          position?: number;
          workspace_id: string;
        };
        Update: {
          asset_id?: string | null;
          bible_entry_id?: string;
          created_at?: string;
          id?: string;
          label?: string | null;
          position?: number;
          workspace_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "bible_references_asset_id_fkey";
            columns: ["asset_id"];
            isOneToOne: false;
            referencedRelation: "assets";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "bible_references_bible_entry_id_fkey";
            columns: ["bible_entry_id"];
            isOneToOne: false;
            referencedRelation: "bible_entries";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "bible_references_workspace_id_fkey";
            columns: ["workspace_id"];
            isOneToOne: false;
            referencedRelation: "workspaces";
            referencedColumns: ["id"];
          },
        ];
      };
      category_presets: {
        Row: {
          audio_rules: Json;
          created_at: string;
          discovery_rules: Json;
          id: string;
          is_active: boolean;
          name: string;
          scoring_weights: Json;
          script_rules: Json;
          slug: string;
          title_rules: Json;
          updated_at: string;
          visual_rules: Json;
          workspace_id: string;
        };
        Insert: {
          audio_rules?: Json;
          created_at?: string;
          discovery_rules?: Json;
          id?: string;
          is_active?: boolean;
          name: string;
          scoring_weights?: Json;
          script_rules?: Json;
          slug: string;
          title_rules?: Json;
          updated_at?: string;
          visual_rules?: Json;
          workspace_id: string;
        };
        Update: {
          audio_rules?: Json;
          created_at?: string;
          discovery_rules?: Json;
          id?: string;
          is_active?: boolean;
          name?: string;
          scoring_weights?: Json;
          script_rules?: Json;
          slug?: string;
          title_rules?: Json;
          updated_at?: string;
          visual_rules?: Json;
          workspace_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "category_presets_workspace_id_fkey";
            columns: ["workspace_id"];
            isOneToOne: false;
            referencedRelation: "workspaces";
            referencedColumns: ["id"];
          },
        ];
      };
      episodes: {
        Row: {
          category_preset_id: string | null;
          created_at: string;
          id: string;
          project_id: string | null;
          published_at: string | null;
          published_url: string | null;
          stage: Database["public"]["Enums"]["production_stage"];
          target_duration_seconds: number | null;
          updated_at: string;
          working_title: string;
          workspace_id: string;
        };
        Insert: {
          category_preset_id?: string | null;
          created_at?: string;
          id?: string;
          project_id?: string | null;
          published_at?: string | null;
          published_url?: string | null;
          stage?: Database["public"]["Enums"]["production_stage"];
          target_duration_seconds?: number | null;
          updated_at?: string;
          working_title: string;
          workspace_id: string;
        };
        Update: {
          category_preset_id?: string | null;
          created_at?: string;
          id?: string;
          project_id?: string | null;
          published_at?: string | null;
          published_url?: string | null;
          stage?: Database["public"]["Enums"]["production_stage"];
          target_duration_seconds?: number | null;
          updated_at?: string;
          working_title?: string;
          workspace_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "episodes_category_preset_id_fkey";
            columns: ["category_preset_id"];
            isOneToOne: false;
            referencedRelation: "category_presets";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "episodes_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "episodes_workspace_id_fkey";
            columns: ["workspace_id"];
            isOneToOne: false;
            referencedRelation: "workspaces";
            referencedColumns: ["id"];
          },
        ];
      };
      generations: {
        Row: {
          completed_at: string | null;
          cost_usd: number | null;
          created_at: string;
          episode_id: string | null;
          error: Json | null;
          id: string;
          input_tokens: number | null;
          kind: string;
          model: string;
          output_tokens: number | null;
          parent_generation_id: string | null;
          prompt_version_id: string | null;
          provider: string;
          request: Json;
          response: Json | null;
          started_at: string | null;
          status: Database["public"]["Enums"]["run_status"];
          workspace_id: string;
        };
        Insert: {
          completed_at?: string | null;
          cost_usd?: number | null;
          created_at?: string;
          episode_id?: string | null;
          error?: Json | null;
          id?: string;
          input_tokens?: number | null;
          kind: string;
          model: string;
          output_tokens?: number | null;
          parent_generation_id?: string | null;
          prompt_version_id?: string | null;
          provider: string;
          request?: Json;
          response?: Json | null;
          started_at?: string | null;
          status?: Database["public"]["Enums"]["run_status"];
          workspace_id: string;
        };
        Update: {
          completed_at?: string | null;
          cost_usd?: number | null;
          created_at?: string;
          episode_id?: string | null;
          error?: Json | null;
          id?: string;
          input_tokens?: number | null;
          kind?: string;
          model?: string;
          output_tokens?: number | null;
          parent_generation_id?: string | null;
          prompt_version_id?: string | null;
          provider?: string;
          request?: Json;
          response?: Json | null;
          started_at?: string | null;
          status?: Database["public"]["Enums"]["run_status"];
          workspace_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "generations_episode_id_fkey";
            columns: ["episode_id"];
            isOneToOne: false;
            referencedRelation: "episodes";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "generations_parent_generation_id_fkey";
            columns: ["parent_generation_id"];
            isOneToOne: false;
            referencedRelation: "generations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "generations_prompt_version_id_fkey";
            columns: ["prompt_version_id"];
            isOneToOne: false;
            referencedRelation: "prompt_versions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "generations_workspace_id_fkey";
            columns: ["workspace_id"];
            isOneToOne: false;
            referencedRelation: "workspaces";
            referencedColumns: ["id"];
          },
        ];
      };
      job_steps: {
        Row: {
          completed_at: string | null;
          error: Json | null;
          generation_id: string | null;
          id: string;
          input: Json;
          job_id: string;
          name: string;
          output: Json | null;
          position: number;
          started_at: string | null;
          status: Database["public"]["Enums"]["run_status"];
          workspace_id: string;
        };
        Insert: {
          completed_at?: string | null;
          error?: Json | null;
          generation_id?: string | null;
          id?: string;
          input?: Json;
          job_id: string;
          name: string;
          output?: Json | null;
          position: number;
          started_at?: string | null;
          status?: Database["public"]["Enums"]["run_status"];
          workspace_id: string;
        };
        Update: {
          completed_at?: string | null;
          error?: Json | null;
          generation_id?: string | null;
          id?: string;
          input?: Json;
          job_id?: string;
          name?: string;
          output?: Json | null;
          position?: number;
          started_at?: string | null;
          status?: Database["public"]["Enums"]["run_status"];
          workspace_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "job_steps_generation_id_fkey";
            columns: ["generation_id"];
            isOneToOne: false;
            referencedRelation: "generations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "job_steps_job_id_fkey";
            columns: ["job_id"];
            isOneToOne: false;
            referencedRelation: "jobs";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "job_steps_workspace_id_fkey";
            columns: ["workspace_id"];
            isOneToOne: false;
            referencedRelation: "workspaces";
            referencedColumns: ["id"];
          },
        ];
      };
      jobs: {
        Row: {
          attempt: number;
          completed_at: string | null;
          created_at: string;
          episode_id: string | null;
          error: Json | null;
          id: string;
          idempotency_key: string;
          input: Json;
          kind: string;
          max_attempts: number;
          output: Json | null;
          started_at: string | null;
          status: Database["public"]["Enums"]["run_status"];
          updated_at: string;
          workspace_id: string;
        };
        Insert: {
          attempt?: number;
          completed_at?: string | null;
          created_at?: string;
          episode_id?: string | null;
          error?: Json | null;
          id?: string;
          idempotency_key: string;
          input?: Json;
          kind: string;
          max_attempts?: number;
          output?: Json | null;
          started_at?: string | null;
          status?: Database["public"]["Enums"]["run_status"];
          updated_at?: string;
          workspace_id: string;
        };
        Update: {
          attempt?: number;
          completed_at?: string | null;
          created_at?: string;
          episode_id?: string | null;
          error?: Json | null;
          id?: string;
          idempotency_key?: string;
          input?: Json;
          kind?: string;
          max_attempts?: number;
          output?: Json | null;
          started_at?: string | null;
          status?: Database["public"]["Enums"]["run_status"];
          updated_at?: string;
          workspace_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "jobs_episode_id_fkey";
            columns: ["episode_id"];
            isOneToOne: false;
            referencedRelation: "episodes";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "jobs_workspace_id_fkey";
            columns: ["workspace_id"];
            isOneToOne: false;
            referencedRelation: "workspaces";
            referencedColumns: ["id"];
          },
        ];
      };
      profiles: {
        Row: {
          avatar_path: string | null;
          created_at: string;
          display_name: string | null;
          id: string;
          updated_at: string;
        };
        Insert: {
          avatar_path?: string | null;
          created_at?: string;
          display_name?: string | null;
          id: string;
          updated_at?: string;
        };
        Update: {
          avatar_path?: string | null;
          created_at?: string;
          display_name?: string | null;
          id?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      projects: {
        Row: {
          created_at: string;
          description: string | null;
          id: string;
          name: string;
          updated_at: string;
          workspace_id: string;
        };
        Insert: {
          created_at?: string;
          description?: string | null;
          id?: string;
          name: string;
          updated_at?: string;
          workspace_id: string;
        };
        Update: {
          created_at?: string;
          description?: string | null;
          id?: string;
          name?: string;
          updated_at?: string;
          workspace_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "projects_workspace_id_fkey";
            columns: ["workspace_id"];
            isOneToOne: false;
            referencedRelation: "workspaces";
            referencedColumns: ["id"];
          },
        ];
      };
      prompt_versions: {
        Row: {
          created_at: string;
          id: string;
          name: string;
          purpose: string;
          template: string;
          variables_schema: Json;
          version: number;
          workspace_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          name: string;
          purpose: string;
          template: string;
          variables_schema?: Json;
          version: number;
          workspace_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          name?: string;
          purpose?: string;
          template?: string;
          variables_schema?: Json;
          version?: number;
          workspace_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "prompt_versions_workspace_id_fkey";
            columns: ["workspace_id"];
            isOneToOne: false;
            referencedRelation: "workspaces";
            referencedColumns: ["id"];
          },
        ];
      };
      render_versions: {
        Row: {
          approved_at: string | null;
          approved_by: string | null;
          created_at: string;
          episode_id: string;
          id: string;
          manifest: Json;
          output_asset_id: string | null;
          scene_plan_version_id: string;
          status: Database["public"]["Enums"]["approval_status"];
          version: number;
          workspace_id: string;
        };
        Insert: {
          approved_at?: string | null;
          approved_by?: string | null;
          created_at?: string;
          episode_id: string;
          id?: string;
          manifest: Json;
          output_asset_id?: string | null;
          scene_plan_version_id: string;
          status?: Database["public"]["Enums"]["approval_status"];
          version: number;
          workspace_id: string;
        };
        Update: {
          approved_at?: string | null;
          approved_by?: string | null;
          created_at?: string;
          episode_id?: string;
          id?: string;
          manifest?: Json;
          output_asset_id?: string | null;
          scene_plan_version_id?: string;
          status?: Database["public"]["Enums"]["approval_status"];
          version?: number;
          workspace_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "render_versions_episode_id_fkey";
            columns: ["episode_id"];
            isOneToOne: false;
            referencedRelation: "episodes";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "render_versions_output_asset_id_fkey";
            columns: ["output_asset_id"];
            isOneToOne: false;
            referencedRelation: "assets";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "render_versions_scene_plan_version_id_fkey";
            columns: ["scene_plan_version_id"];
            isOneToOne: false;
            referencedRelation: "scene_plan_versions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "render_versions_workspace_id_fkey";
            columns: ["workspace_id"];
            isOneToOne: false;
            referencedRelation: "workspaces";
            referencedColumns: ["id"];
          },
        ];
      };
      research_evidence: {
        Row: {
          claim: string;
          confidence: number | null;
          created_at: string;
          episode_id: string | null;
          evidence_excerpt: string | null;
          id: string;
          source_document_id: string;
          story_idea_id: string | null;
          workspace_id: string;
        };
        Insert: {
          claim: string;
          confidence?: number | null;
          created_at?: string;
          episode_id?: string | null;
          evidence_excerpt?: string | null;
          id?: string;
          source_document_id: string;
          story_idea_id?: string | null;
          workspace_id: string;
        };
        Update: {
          claim?: string;
          confidence?: number | null;
          created_at?: string;
          episode_id?: string | null;
          evidence_excerpt?: string | null;
          id?: string;
          source_document_id?: string;
          story_idea_id?: string | null;
          workspace_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "research_evidence_episode_id_fkey";
            columns: ["episode_id"];
            isOneToOne: false;
            referencedRelation: "episodes";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "research_evidence_source_document_id_fkey";
            columns: ["source_document_id"];
            isOneToOne: false;
            referencedRelation: "source_documents";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "research_evidence_story_idea_workspace_fkey";
            columns: ["story_idea_id", "workspace_id"];
            isOneToOne: false;
            referencedRelation: "story_ideas";
            referencedColumns: ["id", "workspace_id"];
          },
          {
            foreignKeyName: "research_evidence_workspace_id_fkey";
            columns: ["workspace_id"];
            isOneToOne: false;
            referencedRelation: "workspaces";
            referencedColumns: ["id"];
          },
        ];
      };
      scene_plan_versions: {
        Row: {
          approved_at: string | null;
          approved_by: string | null;
          created_at: string;
          episode_id: string;
          id: string;
          script_version_id: string;
          status: Database["public"]["Enums"]["approval_status"];
          version: number;
          workspace_id: string;
        };
        Insert: {
          approved_at?: string | null;
          approved_by?: string | null;
          created_at?: string;
          episode_id: string;
          id?: string;
          script_version_id: string;
          status?: Database["public"]["Enums"]["approval_status"];
          version: number;
          workspace_id: string;
        };
        Update: {
          approved_at?: string | null;
          approved_by?: string | null;
          created_at?: string;
          episode_id?: string;
          id?: string;
          script_version_id?: string;
          status?: Database["public"]["Enums"]["approval_status"];
          version?: number;
          workspace_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "scene_plan_versions_episode_workspace_fkey";
            columns: ["episode_id", "workspace_id"];
            isOneToOne: false;
            referencedRelation: "episodes";
            referencedColumns: ["id", "workspace_id"];
          },
          {
            foreignKeyName: "scene_plan_versions_script_workspace_fkey";
            columns: ["script_version_id", "workspace_id"];
            isOneToOne: false;
            referencedRelation: "script_versions";
            referencedColumns: ["id", "workspace_id"];
          },
          {
            foreignKeyName: "scene_plan_versions_workspace_id_fkey";
            columns: ["workspace_id"];
            isOneToOne: false;
            referencedRelation: "workspaces";
            referencedColumns: ["id"];
          },
        ];
      };
      scene_segments: {
        Row: {
          position: number;
          scene_id: string;
          script_segment_id: string;
          workspace_id: string;
        };
        Insert: {
          position?: number;
          scene_id: string;
          script_segment_id: string;
          workspace_id: string;
        };
        Update: {
          position?: number;
          scene_id?: string;
          script_segment_id?: string;
          workspace_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "scene_segments_scene_workspace_fkey";
            columns: ["scene_id", "workspace_id"];
            isOneToOne: false;
            referencedRelation: "scenes";
            referencedColumns: ["id", "workspace_id"];
          },
          {
            foreignKeyName: "scene_segments_script_segment_workspace_fkey";
            columns: ["script_segment_id", "workspace_id"];
            isOneToOne: false;
            referencedRelation: "script_segments";
            referencedColumns: ["id", "workspace_id"];
          },
          {
            foreignKeyName: "scene_segments_workspace_id_fkey";
            columns: ["workspace_id"];
            isOneToOne: false;
            referencedRelation: "workspaces";
            referencedColumns: ["id"];
          },
        ];
      };
      scenes: {
        Row: {
          ambience: string | null;
          camera_motion: string | null;
          description: string;
          duration_ms: number | null;
          id: string;
          metadata: Json;
          negative_prompt: string | null;
          position: number;
          scene_plan_version_id: string;
          title: string | null;
          visual_prompt: string | null;
          workspace_id: string;
        };
        Insert: {
          ambience?: string | null;
          camera_motion?: string | null;
          description: string;
          duration_ms?: number | null;
          id?: string;
          metadata?: Json;
          negative_prompt?: string | null;
          position: number;
          scene_plan_version_id: string;
          title?: string | null;
          visual_prompt?: string | null;
          workspace_id: string;
        };
        Update: {
          ambience?: string | null;
          camera_motion?: string | null;
          description?: string;
          duration_ms?: number | null;
          id?: string;
          metadata?: Json;
          negative_prompt?: string | null;
          position?: number;
          scene_plan_version_id?: string;
          title?: string | null;
          visual_prompt?: string | null;
          workspace_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "scenes_plan_workspace_fkey";
            columns: ["scene_plan_version_id", "workspace_id"];
            isOneToOne: false;
            referencedRelation: "scene_plan_versions";
            referencedColumns: ["id", "workspace_id"];
          },
          {
            foreignKeyName: "scenes_workspace_id_fkey";
            columns: ["workspace_id"];
            isOneToOne: false;
            referencedRelation: "workspaces";
            referencedColumns: ["id"];
          },
        ];
      };
      script_segments: {
        Row: {
          emotion: string | null;
          estimated_duration_ms: number | null;
          id: string;
          metadata: Json;
          narration: string;
          position: number;
          script_version_id: string;
          workspace_id: string;
        };
        Insert: {
          emotion?: string | null;
          estimated_duration_ms?: number | null;
          id?: string;
          metadata?: Json;
          narration: string;
          position: number;
          script_version_id: string;
          workspace_id: string;
        };
        Update: {
          emotion?: string | null;
          estimated_duration_ms?: number | null;
          id?: string;
          metadata?: Json;
          narration?: string;
          position?: number;
          script_version_id?: string;
          workspace_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "script_segments_version_workspace_fkey";
            columns: ["script_version_id", "workspace_id"];
            isOneToOne: false;
            referencedRelation: "script_versions";
            referencedColumns: ["id", "workspace_id"];
          },
          {
            foreignKeyName: "script_segments_workspace_id_fkey";
            columns: ["workspace_id"];
            isOneToOne: false;
            referencedRelation: "workspaces";
            referencedColumns: ["id"];
          },
        ];
      };
      script_versions: {
        Row: {
          approved_at: string | null;
          approved_by: string | null;
          created_at: string;
          episode_id: string;
          full_text: string;
          id: string;
          language_code: string;
          status: Database["public"]["Enums"]["approval_status"];
          story_brief_version_id: string;
          title: string | null;
          version: number;
          workspace_id: string;
        };
        Insert: {
          approved_at?: string | null;
          approved_by?: string | null;
          created_at?: string;
          episode_id: string;
          full_text?: string;
          id?: string;
          language_code?: string;
          status?: Database["public"]["Enums"]["approval_status"];
          story_brief_version_id: string;
          title?: string | null;
          version: number;
          workspace_id: string;
        };
        Update: {
          approved_at?: string | null;
          approved_by?: string | null;
          created_at?: string;
          episode_id?: string;
          full_text?: string;
          id?: string;
          language_code?: string;
          status?: Database["public"]["Enums"]["approval_status"];
          story_brief_version_id?: string;
          title?: string | null;
          version?: number;
          workspace_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "script_versions_episode_workspace_fkey";
            columns: ["episode_id", "workspace_id"];
            isOneToOne: false;
            referencedRelation: "episodes";
            referencedColumns: ["id", "workspace_id"];
          },
          {
            foreignKeyName: "script_versions_brief_workspace_fkey";
            columns: ["story_brief_version_id", "workspace_id"];
            isOneToOne: false;
            referencedRelation: "story_brief_versions";
            referencedColumns: ["id", "workspace_id"];
          },
          {
            foreignKeyName: "script_versions_workspace_id_fkey";
            columns: ["workspace_id"];
            isOneToOne: false;
            referencedRelation: "workspaces";
            referencedColumns: ["id"];
          },
        ];
      };
      source_documents: {
        Row: {
          content_excerpt: string | null;
          created_at: string;
          id: string;
          metadata: Json;
          published_at: string | null;
          publisher: string | null;
          retrieved_at: string;
          source_url: string | null;
          story_idea_id: string | null;
          title: string;
          workspace_id: string;
        };
        Insert: {
          content_excerpt?: string | null;
          created_at?: string;
          id?: string;
          metadata?: Json;
          published_at?: string | null;
          publisher?: string | null;
          retrieved_at?: string;
          source_url?: string | null;
          story_idea_id?: string | null;
          title: string;
          workspace_id: string;
        };
        Update: {
          content_excerpt?: string | null;
          created_at?: string;
          id?: string;
          metadata?: Json;
          published_at?: string | null;
          publisher?: string | null;
          retrieved_at?: string;
          source_url?: string | null;
          story_idea_id?: string | null;
          title?: string;
          workspace_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "source_documents_story_idea_workspace_fkey";
            columns: ["story_idea_id", "workspace_id"];
            isOneToOne: false;
            referencedRelation: "story_ideas";
            referencedColumns: ["id", "workspace_id"];
          },
          {
            foreignKeyName: "source_documents_workspace_id_fkey";
            columns: ["workspace_id"];
            isOneToOne: false;
            referencedRelation: "workspaces";
            referencedColumns: ["id"];
          },
        ];
      };
      story_brief_versions: {
        Row: {
          approved_at: string | null;
          approved_by: string | null;
          content: Json;
          created_at: string;
          episode_id: string;
          id: string;
          status: Database["public"]["Enums"]["approval_status"];
          version: number;
          workspace_id: string;
        };
        Insert: {
          approved_at?: string | null;
          approved_by?: string | null;
          content: Json;
          created_at?: string;
          episode_id: string;
          id?: string;
          status?: Database["public"]["Enums"]["approval_status"];
          version: number;
          workspace_id: string;
        };
        Update: {
          approved_at?: string | null;
          approved_by?: string | null;
          content?: Json;
          created_at?: string;
          episode_id?: string;
          id?: string;
          status?: Database["public"]["Enums"]["approval_status"];
          version?: number;
          workspace_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "story_brief_versions_episode_id_fkey";
            columns: ["episode_id"];
            isOneToOne: false;
            referencedRelation: "episodes";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "story_brief_versions_workspace_id_fkey";
            columns: ["workspace_id"];
            isOneToOne: false;
            referencedRelation: "workspaces";
            referencedColumns: ["id"];
          },
        ];
      };
      story_ideas: {
        Row: {
          category_preset_id: string | null;
          created_at: string;
          duplicate_of: string | null;
          episode_id: string | null;
          id: string;
          rationale: string | null;
          scores: Json;
          source_kind: string;
          synopsis: string | null;
          title: string;
          updated_at: string;
          workspace_id: string;
        };
        Insert: {
          category_preset_id?: string | null;
          created_at?: string;
          duplicate_of?: string | null;
          episode_id?: string | null;
          id?: string;
          rationale?: string | null;
          scores?: Json;
          source_kind?: string;
          synopsis?: string | null;
          title: string;
          updated_at?: string;
          workspace_id: string;
        };
        Update: {
          category_preset_id?: string | null;
          created_at?: string;
          duplicate_of?: string | null;
          episode_id?: string | null;
          id?: string;
          rationale?: string | null;
          scores?: Json;
          source_kind?: string;
          synopsis?: string | null;
          title?: string;
          updated_at?: string;
          workspace_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "story_ideas_category_preset_id_fkey";
            columns: ["category_preset_id"];
            isOneToOne: false;
            referencedRelation: "category_presets";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "story_ideas_duplicate_of_fkey";
            columns: ["duplicate_of"];
            isOneToOne: false;
            referencedRelation: "story_ideas";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "story_ideas_episode_id_fkey";
            columns: ["episode_id"];
            isOneToOne: false;
            referencedRelation: "episodes";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "story_ideas_workspace_id_fkey";
            columns: ["workspace_id"];
            isOneToOne: false;
            referencedRelation: "workspaces";
            referencedColumns: ["id"];
          },
        ];
      };
      workspace_members: {
        Row: {
          created_at: string;
          role: Database["public"]["Enums"]["workspace_role"];
          user_id: string;
          workspace_id: string;
        };
        Insert: {
          created_at?: string;
          role?: Database["public"]["Enums"]["workspace_role"];
          user_id: string;
          workspace_id: string;
        };
        Update: {
          created_at?: string;
          role?: Database["public"]["Enums"]["workspace_role"];
          user_id?: string;
          workspace_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "workspace_members_workspace_id_fkey";
            columns: ["workspace_id"];
            isOneToOne: false;
            referencedRelation: "workspaces";
            referencedColumns: ["id"];
          },
        ];
      };
      workspaces: {
        Row: {
          created_at: string;
          created_by: string;
          id: string;
          name: string;
          slug: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          created_by: string;
          id?: string;
          name: string;
          slug: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          created_by?: string;
          id?: string;
          name?: string;
          slug?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      create_bible_entry_version: {
        Args: {
          p_content: Json;
          p_kind: string;
          p_name: string;
          p_slug: string;
          p_workspace_id: string;
        };
        Returns: {
          bible_entry_id: string;
          version: number;
        }[];
      };
      create_scene_plan_version: {
        Args: {
          p_episode_id: string;
          p_scenes: Json;
          p_script_version_id: string;
        };
        Returns: {
          scene_plan_id: string;
          version: number;
        }[];
      };
      create_script_version: {
        Args: {
          p_episode_id: string;
          p_full_text: string;
          p_segments: Json;
          p_story_brief_version_id: string;
          p_title: string;
        };
        Returns: {
          script_id: string;
          version: number;
        }[];
      };
      create_story_brief_from_idea: {
        Args: {
          p_content: Json;
          p_idea_id: string;
          p_target_duration_seconds: number;
        };
        Returns: {
          brief_id: string;
          episode_id: string;
        }[];
      };
    };
    Enums: {
      approval_status: "draft" | "approved" | "rejected";
      asset_kind:
        "image" | "audio" | "video" | "subtitle" | "document" | "other";
      production_stage:
        | "idea"
        | "research"
        | "brief"
        | "script"
        | "scenes"
        | "visuals"
        | "audio"
        | "render"
        | "review"
        | "ready"
        | "published"
        | "archived";
      run_status:
        "pending" | "running" | "paused" | "succeeded" | "failed" | "cancelled";
      workspace_role: "owner" | "editor" | "viewer";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<
  keyof Database,
  "public"
>];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema["Enums"] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {
      approval_status: ["draft", "approved", "rejected"],
      asset_kind: ["image", "audio", "video", "subtitle", "document", "other"],
      production_stage: [
        "idea",
        "research",
        "brief",
        "script",
        "scenes",
        "visuals",
        "audio",
        "render",
        "review",
        "ready",
        "published",
        "archived",
      ],
      run_status: [
        "pending",
        "running",
        "paused",
        "succeeded",
        "failed",
        "cancelled",
      ],
      workspace_role: ["owner", "editor", "viewer"],
    },
  },
} as const;
