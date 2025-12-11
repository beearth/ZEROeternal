
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ektanncfszcrgdixumnl.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVrdGFubmNmc3pjcmdkaXh1bW5sIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU0MjYzMzUsImV4cCI6MjA4MTAwMjMzNX0.qspa-rsV__nH1sFQXOwXIcPCiZlyISWoyAr5I3eY2Ic';

export const supabase = createClient(supabaseUrl, supabaseKey);
