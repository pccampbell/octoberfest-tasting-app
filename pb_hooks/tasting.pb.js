// Runtime configuration keeps the QR destination configurable without rebuilding.
routerAdd('GET', '/api/tasting/config', (e) => {
  e.response.header().set('Cache-Control', 'no-store');
  return e.json(200, { publicUrl: $os.getenv('PUBLIC_APP_URL') || '' });
});

// Reserve unknown API paths so the built-in SPA fallback cannot return HTML.
routerAdd('GET', '/api/{path...}', () => {
  throw new NotFoundError();
});

onRecordValidate((e) => {
  e.record.set('display_name', e.record.getString('display_name').trim());
  if (!/^g-[a-f0-9]{32}@tasting\.invalid$/.test(e.record.getString('email')))
    throw new BadRequestError('Use a generated tasting identity.');
  e.next();
}, 'guests');

// Generated .invalid identities never participate in email workflows.
onRecordRequestPasswordResetRequest(() => {
  throw new ForbiddenError();
}, 'guests');
onRecordRequestVerificationRequest(() => {
  throw new ForbiddenError();
}, 'guests');
onRecordRequestEmailChangeRequest(() => {
  throw new ForbiddenError();
}, 'guests');

// Deactivate rated beers instead of deleting the event's history.
onRecordDelete((e) => {
  const count = e.app.countRecords('ratings', $dbx.hashExp({ beer: e.record.id }));
  if (count > 0) throw new BadRequestError('This beer has ratings. Deactivate it instead.');
  e.next();
}, 'beers');
