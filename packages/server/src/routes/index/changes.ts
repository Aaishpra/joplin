import { SubPath } from '../../utils/routeUtils';
import Router from '../../utils/Router';
import { AppContext } from '../../utils/types';
import { changeTypeToString } from '../../db';
import { PaginationOrderDir } from '../../models/utils/pagination';
import { formatDateTime } from '../../utils/time';
import defaultView from '../../utils/defaultView';
import { View } from '../../services/MustacheService';
import { makeTablePagination, Table, Row, makeTableView, tablePartials } from '../../utils/views/table';

const router = new Router();

router.get('changes', async (_path: SubPath, ctx: AppContext) => {
	const pagination = makeTablePagination(ctx.query, 'updated_time', PaginationOrderDir.DESC);
	const paginatedChanges = await ctx.models.change().allByUser(ctx.owner.id, pagination);
	const items = await ctx.models.item().loadByIds(paginatedChanges.items.map(i => i.item_id), { fields: ['id'] });

	const table: Table = {
		baseUrl: ctx.models.change().changeUrl(),
		requestQuery: ctx.query,
		pageCount: paginatedChanges.page_count,
		pagination,
		headers: [
			{
				name: 'item_name',
				label: 'Name',
				stretch: true,
			},
			{
				name: 'type',
				label: 'Type',
			},
			{
				name: 'updated_time',
				label: 'Timestamp',
			},
		],
		rows: paginatedChanges.items.map(change => {
			const row: Row = [
				{
					value: change.item_name,
					stretch: true,
					url: items.find(i => i.id === change.item_id) ? ctx.models.item().itemContentUrl(change.item_id) : '',
				},
				{
					value: changeTypeToString(change.type),
				},
				{
					value: formatDateTime(change.updated_time),
				},
			];

			return row;
		}),
	};

	const view: View = defaultView('changes');
	view.content.changeTable = makeTableView(table),
	view.cssFiles = ['index/changes'];
	view.partials = view.partials.concat(tablePartials());
	return view;
});

export default router;
