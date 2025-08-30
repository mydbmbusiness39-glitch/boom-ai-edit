-- Add project_id column to uploads table to associate uploads with projects
ALTER TABLE public.uploads ADD COLUMN project_id text;

-- Create index for better performance when querying uploads by project
CREATE INDEX idx_uploads_project_id ON public.uploads(project_id);

-- Create index for user_id + project_id combinations
CREATE INDEX idx_uploads_user_project ON public.uploads(user_id, project_id);