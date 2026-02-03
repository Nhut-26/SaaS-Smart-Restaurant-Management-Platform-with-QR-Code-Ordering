from supabase import create_client, Client

SUPABASE_URL = "https://vhjxxgajenkzuykkqloi.supabase.co"
SUPABASE_SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZoanh4Z2FqZW5renV5a2txbG9pIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzQ5ODIyMiwiZXhwIjoyMDgzMDc0MjIyfQ.c6AfU8do1i4pgxiE-1SCrT6OU6Sgj4aSbhB-Rh981MM"

supabase: Client = create_client(
    SUPABASE_URL,
    SUPABASE_SERVICE_KEY
)