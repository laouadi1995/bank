using Npgsql;

var connStr = "Host=db.ezctgdliejbrqhqskojy.supabase.co;Port=5432;Database=postgres;Username=postgres;Password=LAOUADIcanada2026;SSL Mode=Require;Trust Server Certificate=true";

await using var conn = new NpgsqlConnection(connStr);
await conn.OpenAsync();

// Drop all tables in public schema
var sql = @"
DO $$ DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public') LOOP
        EXECUTE 'DROP TABLE IF EXISTS public.' || quote_ident(r.tablename) || ' CASCADE';
    END LOOP;
END $$;";

await using var cmd = new NpgsqlCommand(sql, conn);
await cmd.ExecuteNonQueryAsync();

Console.WriteLine("Toutes les tables supprimées avec succès.");
