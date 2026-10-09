migrate(
  (app) => {
    const dates = () => [
      { name: 'created', type: 'autodate', onCreate: true },
      { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
    ];
    const guests = new Collection({
      name: 'guests',
      type: 'auth',
      listRule: null,
      viewRule: 'id = @request.auth.id',
      createRule: '@request.body.verified != true && @request.body.emailVisibility != true',
      updateRule: null,
      deleteRule: null,
      manageRule: null,
      authRule: '',
      passwordAuth: { enabled: true, identityFields: ['email'] },
      authAlert: { enabled: false },
      fields: [
        {
          name: 'display_name',
          type: 'text',
          required: true,
          min: 1,
          max: 40,
          pattern: '\\S',
        },
        ...dates(),
      ],
    });
    app.save(guests);
    const beers = new Collection({
      name: 'beers',
      type: 'base',
      listRule: 'is_active = true',
      viewRule: 'is_active = true',
      createRule: null,
      updateRule: null,
      deleteRule: null,
      fields: [
        { name: 'name', type: 'text', required: true, max: 100 },
        { name: 'brewery', type: 'text', max: 100 },
        { name: 'style', type: 'text', max: 80 },
        { name: 'abv', type: 'number', min: 0, max: 30 },
        { name: 'description', type: 'text', max: 1000 },
        {
          name: 'image',
          type: 'file',
          maxSelect: 1,
          maxSize: 5242880,
          mimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
          thumbs: ['400x400'],
        },
        { name: 'sort_order', type: 'number', onlyInt: true },
        { name: 'is_active', type: 'bool' },
        ...dates(),
      ],
    });
    app.save(beers);
    const owner = '@request.auth.collectionName = "guests" && guest = @request.auth.id';
    const ratings = new Collection({
      name: 'ratings',
      type: 'base',
      listRule: owner,
      viewRule: owner,
      createRule: owner + ' && beer.is_active = true',
      updateRule:
        owner + ' && @request.body.guest:changed = false && @request.body.beer:changed = false',
      deleteRule: owner,
      fields: [
        {
          name: 'guest',
          type: 'relation',
          required: true,
          collectionId: guests.id,
          maxSelect: 1,
          cascadeDelete: false,
        },
        {
          name: 'beer',
          type: 'relation',
          required: true,
          collectionId: beers.id,
          maxSelect: 1,
          cascadeDelete: false,
        },
        {
          name: 'score',
          type: 'number',
          required: true,
          min: 1,
          max: 10,
          onlyInt: true,
        },
        { name: 'notes', type: 'text', max: 300 },
        ...dates(),
      ],
      indexes: ['CREATE UNIQUE INDEX idx_ratings_guest_beer ON ratings (guest, beer)'],
    });
    app.save(ratings);
    app.save(
      new Collection({
        name: 'beer_results',
        type: 'view',
        listRule: '',
        viewRule: '',
        viewQuery: `SELECT b.id AS id, b.name, b.brewery, b.style, b.abv,
      AVG(r.score) AS average_score, COUNT(r.id) AS rating_count
      FROM beers b LEFT JOIN ratings r ON r.beer = b.id
      WHERE b.is_active = 1 GROUP BY b.id`,
      }),
    );
    app.save(
      new Collection({
        name: 'party_stats',
        type: 'view',
        listRule: '',
        viewRule: '',
        viewQuery: `SELECT 'party_statistics' AS id, COUNT(r.id) AS total_ratings,
      COUNT(DISTINCT r.guest) AS participants,
      (SELECT COUNT(*) FROM beers WHERE is_active = 1) AS beer_count
      FROM ratings r JOIN beers b ON b.id = r.beer WHERE b.is_active = 1`,
      }),
    );
    const settings = app.settings();
    settings.meta.appName = 'Oktoberfest Tasting';
    settings.rateLimits.enabled = true;
    // Allow arrivals together behind one router without disabling abuse protection.
    settings.rateLimits.rules = [
      {
        label: '/api/collections/guests/auth-with-password',
        audience: '',
        duration: 60,
        maxRequests: 120,
      },
      { label: 'guests:create', audience: '', duration: 60, maxRequests: 60 },
      { label: '*:auth', audience: '', duration: 60, maxRequests: 30 },
      { label: '/api/', audience: '', duration: 60, maxRequests: 1200 },
    ];
    app.save(settings);
  },
  (app) => {
    for (const name of ['party_stats', 'beer_results', 'ratings', 'beers', 'guests'])
      app.delete(app.findCollectionByNameOrId(name));
  },
);
