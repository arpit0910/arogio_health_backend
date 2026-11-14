function reviewBloodBank(row) {
  openEditor(
    'Review blood-bank source',
    [
      field('sourceUrl', 'Primary HTTPS source', row.source_url || '', 'url'),
      field('reviewerName', 'Reviewer full name'),
      field('reviewerQualification', 'Reviewer role'),
      field('evidence', 'Contact/address evidence independently checked', '', 'textarea'),
      field('confirmedSource', 'Primary source checked', false, 'checkbox'),
      field('publish', 'Publish the independently reviewed entry', row.is_verified, 'checkbox'),
    ],
    async (form) => {
      await send(
        `/admin/care/blood-banks/${row.id}/review`,
        {
          sourceUrl: String(form.get('sourceUrl')),
          reviewerName: String(form.get('reviewerName')),
          reviewerQualification: String(form.get('reviewerQualification')),
          evidence: String(form.get('evidence')),
          confirmedSource: form.has('confirmedSource'),
          publish: form.has('publish'),
          expectedUpdatedAt: row.updated_at,
        },
        'POST',
      );
      await directoryPage('blood-banks');
    },
    'Editing or importing always clears earlier review. This explicit source check is recorded in the audit trail. Stock is never represented as live.',
  );
}
