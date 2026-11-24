function reviewBloodBank(row) {
  openEditor(
    'Blood bank listing review',
    [
      field('confirmedDetails', 'I checked the address and contact information', false, 'checkbox'),
      field('publish', 'Approve this listing', true, 'checkbox'),
    ],
    async (form) => {
      await send(
        `/admin/care/blood-banks/${row.id}/review`,
        {
          confirmedDetails: form.has('confirmedDetails'),
          publish: form.has('publish'),
          expectedUpdatedAt: row.updated_at,
        },
        'POST',
      );
      await directoryPage('blood-banks');
    },
    [row.name_en, row.address_en, row.city, row.state, row.phone].filter(Boolean).join(' · '),
  );
  $('save-editor').textContent = 'Save review';
}
