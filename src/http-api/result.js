const querystring = require('querystring');
const { Serializer: JSONAPISerializer } = require('jsonapi-serializer');

class Result {

	constructor(ctx, objects, offset = null, count = null) {
		this.ctx = ctx;
		if (objects instanceof Array) {
			this.objects = objects;
		} else if (objects instanceof Set) {
			this.objects = Array.from(objects);
		} else if (objects instanceof Object) {
			this.objects = [objects];
		}
		this.count = count || this.objects.length;
		this.offset = offset || 0;
	}

	serialize(objectType, relationships = []) {
		if (this.ctx.accepts('application/vnd.api+json')) {
			return this.serializeJSONAPI(objectType, relationships);
		}

		return this.serializeSimple();
	}

	serializeJSONAPI(objectType, relationships) {
		const { prev, next, last } = this.getPaginationLinks();
		let first = `${this.ctx.request.path}`;
		let query = `?${querystring.stringify(this.ctx.request.query)}`;

		if (query === '?') {
			query = '';
		}

		if (this.count === 1) {
			first = null;
		}

		const attributes = Object.keys(this.objects[0]).filter(key => !(key === 'id'));
		const config = {
			attributes,
			topLevelLinks: {
				self: `${this.ctx.request.path}${query}`,
				pagination: {
					first,
					last,
					prev,
					next,
				},
			},
			// dataLinks: {
			// 	self: (record, current) => `${this.ctx.request.path}/${current.id}`,
			// },
		};

		for (const rel of relationships) {
			config[rel] = {
				ref: (collection, field) => field,
			};
		}

		const Serializer = new JSONAPISerializer(objectType, config);

		if (this.objects.length == 1) {
			return Serializer.serialize(this.objects[0]);
		}

		return Serializer.serialize(this.objects);
	}

	serializeSimple() {
		const { prev, next } = this.getPaginationLinks();

		return {
			next,
			prev,
			count: this.count,
			results: this.objects,
		};
	}

	getPaginationLinks() {
		const query = Object.assign({}, this.ctx.request.query);
		let next = null;
		let prev = null;
		let last = null;

		if (this.count > this.objects.length + this.offset) {
			if (query.page) {
				query.page = parseInt(query.page, 10) + 1;
			} else {
				query.page = 1;
			}
			next = `${this.ctx.request.path}?${querystring.stringify(query)}`;
		}

		if (this.offset > 0) {
			if (query.page) {
				query.page = parseInt(query.page, 10) - 1;
			}
			prev = `${this.ctx.request.path}?${querystring.stringify(query)}`;
		}

		query.page = Math.floor(this.count / this.ctx.limit);
		if (query.page > 0) {
			last = `${this.ctx.request.path}?${querystring.stringify(query)}`;
		}

		return { prev, next, last };
	}
}


module.exports = Result;
