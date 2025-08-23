-- Add auto-backup trigger to jobs_new table
CREATE TRIGGER auto_backup_completed_jobs
AFTER UPDATE ON public.jobs_new
FOR EACH ROW
EXECUTE FUNCTION public.auto_backup_processed_video();