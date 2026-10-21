create policy "Super admins read all lessons"
on public.lessons for select
using (public.is_platform_super_admin());

create policy "Super admins read all processing jobs"
on public.processing_jobs for select
using (public.is_platform_super_admin());

create policy "Super admins read all recording assets"
on public.recording_assets for select
using (public.is_platform_super_admin());
