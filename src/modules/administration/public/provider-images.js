/* Shared image control for approved Doctors and Hospitals administration. */
async function providerImageEditor(kind, id) {
  const rev = requestRevision;
  const row = await api(`/admin/${kind}/${id}`);
  if (rev !== requestRevision) return;
  const fields = [],
    file = field('file', 'Choose image', '', 'file');
  const input = file.querySelector('input');
  input.accept = 'image/jpeg,image/png,image/webp';
  if (row.image_revision) {
    const blob = await api(`/admin/${kind}/${id}/image`, { blob: true });
    if (rev !== requestRevision) return;
    const image = el('img');
    image.src = URL.createObjectURL(blob);
    imageUrls.add(image.src);
    image.alt = row.image_alt || row.name_en;
    image.className = 'provider-image-preview';
    fields.push(image);
  }
  fields.push(file, field('alt', 'Image description', row.image_alt || row.name_en));
  const reload = () => (kind === 'doctors' ? doctorsPage() : hospitalsPage());
  if (row.image_revision)
    fields.push(
      button('Remove image', async () => {
        await api(`/admin/${kind}/${id}/image?expected_version=${row.version}`, {
          method: 'DELETE',
        });
        $('editor').close();
        await reload();
      }),
    );
  openEditor(
    `Image: ${row.name_en}`,
    fields,
    async (data) => {
      const selected = input.files[0];
      if (!selected || selected.size > 4 * 1024 * 1024)
        throw new Error('Choose a JPG, PNG or WebP image up to 4 MB.');
      const alt = String(data.get('alt') || '').trim();
      if (!alt) throw new Error('Add an image description.');
      const body = new FormData();
      body.append('file', selected);
      body.append('alt', alt);
      body.append('expectedVersion', String(row.version));
      await api(`/admin/${kind}/${id}/image`, { method: 'PUT', body });
      await reload();
    },
    'Upload a portrait or facility photo up to 4 MB. Replacing or removing the image returns the record to draft for listing review.',
  );
  $('save-editor').textContent = 'Upload image';
}
