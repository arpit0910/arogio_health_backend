function databaseResetPage() {
  reset('Database reset');
  const rev = requestRevision;
  const section = panel('Start with an empty database');
  section.append(
    el(
      'p',
      'Permanently delete all app records: users, administrators, sessions, hospitals, doctors, departments, diseases, articles, uploaded database images, wellness records and audit history. This cannot be undone.',
    ),
  );
  section.append(
    el(
      'p',
      'The database schema and migration history stay in place. You will be signed out. A new super-admin must be created from the server before anyone can use this panel again.',
    ),
  );
  const form = el('form');
  const passwordLabel = el('label', 'Your current super-admin password');
  const password = el('input');
  password.type = 'password';
  password.autocomplete = 'current-password';
  password.required = true;
  passwordLabel.append(password);
  const review = el('button', 'Review database reset');
  review.type = 'submit';
  const error = el('p', '', 'error');
  error.setAttribute('role', 'alert');
  const details = el('div');
  details.className = 'database-reset-review';
  form.append(passwordLabel, review, error, details);
  section.append(form);
  content.append(section);
  let preview = null,
    busy = false;
  function invalidate() {
    preview = null;
    details.replaceChildren();
  }
  password.addEventListener('input', invalidate);
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (busy) return;
    busy = true;
    review.disabled = true;
    error.textContent = '';
    invalidate();
    try {
      const data = await send('/admin/database-reset/preview', { password: password.value });
      if (rev !== requestRevision) return;
      preview = data;
      details.append(el('h3', 'Review the connected database'));
      details.append(el('p', `${data.environment} · ${data.host} · ${data.database}`));
      details.append(
        el(
          'p',
          `${data.tables.length} app tables. Review expires in 10 minutes. All administrators, including your account, will be deleted.`,
        ),
      );
      const inventory = el('details');
      inventory.append(el('summary', 'View every table and its record count'));
      const list = el('dl');
      for (const item of data.tables) {
        list.append(el('dt', item.name), el('dd', item.records));
      }
      inventory.append(list);
      details.append(inventory);
      const label = el('label', `Type ${data.confirmation} to confirm`);
      const confirmation = el('input');
      confirmation.autocomplete = 'off';
      confirmation.spellcheck = false;
      label.append(confirmation);
      const apply = el('button', 'Permanently reset database', 'danger');
      apply.type = 'button';
      apply.disabled = true;
      confirmation.addEventListener('input', () => {
        apply.disabled = busy || confirmation.value !== data.confirmation;
      });
      const cancel = button(
        'Cancel reset',
        () => {
          invalidate();
          password.value = '';
        },
        'secondary',
      );
      const actions = el('div', null, 'database-reset-actions');
      actions.append(cancel, apply);
      details.append(label, actions);
      apply.addEventListener('click', async () => {
        if (busy || preview !== data || confirmation.value !== data.confirmation) return;
        busy = true;
        apply.disabled = true;
        cancel.disabled = true;
        review.disabled = true;
        password.disabled = true;
        confirmation.disabled = true;
        error.textContent = '';
        apply.textContent = 'Resetting database…';
        try {
          await send('/admin/database-reset/apply', {
            password: password.value,
            confirmation: confirmation.value,
            previewToken: data.previewToken,
          });
          await signOut(false);
          $('login-error').textContent =
            'Database reset completed. All app records and administrator accounts were deleted. Run npm run seed:super-admin:production on the server (or npm run seed:super-admin locally) with the required administrator environment variables to restore admin access.';
        } catch (failure) {
          if (rev !== requestRevision) return;
          error.textContent = `${failure.message} Review the database again before retrying.`;
          invalidate();
        } finally {
          busy = false;
          review.disabled = false;
          password.disabled = false;
          password.value = '';
        }
      });
      confirmation.focus();
    } catch (failure) {
      if (rev === requestRevision) error.textContent = failure.message;
    } finally {
      busy = false;
      review.disabled = false;
    }
  });
}
