migrate(
  (app) => {
    const beers = app.findCollectionByNameOrId('beers');
    beers.fields.add(new SelectField({ name: 'country', values: ['US', 'Germany'], maxSelect: 1 }));
    beers.fields.add(new TextField({ name: 'state', max: 80 }));
    app.save(beers);

    const results = app.findCollectionByNameOrId('beer_results');
    results.viewQuery = `SELECT b.id AS id, b.name, b.brewery, b.style, b.abv, b.country, b.state,
      AVG(r.score) AS average_score, COUNT(r.id) AS rating_count
      FROM beers b LEFT JOIN ratings r ON r.beer = b.id
      WHERE b.is_active = 1 GROUP BY b.id`;
    app.save(results);
  },
  (app) => {
    const results = app.findCollectionByNameOrId('beer_results');
    results.viewQuery = `SELECT b.id AS id, b.name, b.brewery, b.style, b.abv,
      AVG(r.score) AS average_score, COUNT(r.id) AS rating_count
      FROM beers b LEFT JOIN ratings r ON r.beer = b.id
      WHERE b.is_active = 1 GROUP BY b.id`;
    app.save(results);

    const beers = app.findCollectionByNameOrId('beers');
    beers.fields.removeByName('country');
    beers.fields.removeByName('state');
    app.save(beers);
  },
);
