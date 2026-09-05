// Única fuente de verdad de quién es superadmin del lado del código.
// Tiene que coincidir con public.is_superadmin() en supabase_setup.sql, que es
// lo que usan las políticas RLS de la base de datos.
export const SUPERADMIN_EMAILS = ['jnmcsky@gmail.com'];

export function esSuperadmin(email: string | null | undefined): boolean {
  return !!email && SUPERADMIN_EMAILS.includes(email);
}
