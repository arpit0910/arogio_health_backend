const diseaseCatalog = {
  endpoint: '/admin/diseases',
  title: 'Diseases',
  singular: 'disease',
  plural: 'diseases',
  byDepartment: true,
  editor: diseaseEditor,
};

function diseasesPage(current = 1, term = '', status = 'all', departmentId = '') {
  return taxonomyPage(diseaseCatalog, { current, term, status, departmentId });
}

async function diseaseEditor(id, reload = diseasesPage) {
  const revision = requestRevision;
  const [row, departments] = await Promise.all([
    id ? api(`/admin/diseases/${id}`) : {},
    taxonomyDepartments(revision),
  ]);
  if (!departments || revision !== requestRevision) return;
  if (!departments.length) throw new Error('Create or import a medical department first.');
  const department = field(
    'department_id',
    'Medical department (required)',
    row.department_id || '',
    'text',
    [['', 'Choose a department'], ...departments.map(item => [
      item.id, item.name_en + (item.is_active ? '' : ' (inactive)'),
    ])],
  );
  department.querySelector('select').required = true;
  openEditor(
    id ? 'Edit disease' : 'Add disease',
    [department, ...taxonomyFields(row)],
    data => saveTaxonomyRecord(diseaseCatalog, row, data, reload, { department_id: data.get('department_id') }),
    id ? `Record key · ${row.record_key}` : 'A disease appears in the public catalog when both it and its department are active.',
  );
}
