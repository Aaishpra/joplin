import { ErrorNotFound } from '../../utils/errors';
import { bodyFields } from '../../utils/requestUtils';
import Router from '../../utils/Router';
import { SubPath } from '../../utils/routeUtils';
import { AppContext } from '../../utils/types';

interface Event {
	name: string;
}

const supportedEvents: Record<string, Function> = {
	syncStart: async (_ctx: AppContext) => {
		// await ctx.models.share().updateSharedItems2(ctx.owner.id);
	},
};

const router = new Router();

router.post('api/events', async (_path: SubPath, ctx: AppContext) => {
	const event = await bodyFields<Event>(ctx.req);
	if (!supportedEvents[event.name]) throw new ErrorNotFound(`Unknown event name: ${event.name}`);
	await supportedEvents[event.name](ctx);
});

export default router;
