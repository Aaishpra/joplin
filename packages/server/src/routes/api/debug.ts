import config from '../../config';
import { createTestUsers } from '../../tools/debugTools';
import { bodyFields } from '../../utils/requestUtils';
import Router from '../../utils/Router';
import { SubPath } from '../../utils/routeUtils';
import { AppContext } from '../../utils/types';

const router = new Router();

router.public = true;

interface Query {
	action: string;
}

router.post('api/debug', async (_path: SubPath, ctx: AppContext) => {
	const query: Query = (await bodyFields(ctx.req)) as Query;

	console.info(`Action: ${query.action}`);

	if (query.action === 'createTestUsers') {
		await createTestUsers(ctx.db, config());
	}
});

export default router;
