import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://kwvjxinrjjzfzxbkvfsc.databasepad.com';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6IjI5NTBlNjU1LTY4MDQtNDA2Yi04MzQxLWRjNDgyOTA0YTAzOCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt3dmp4aW5yamp6Znp4Ymt2ZnNjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDYwMDAwMDAsImV4cCI6MjA2MTAwMDAwMH0.placeholder_key';

export const supabase = createClient(supabaseUrl, supabaseKey);
