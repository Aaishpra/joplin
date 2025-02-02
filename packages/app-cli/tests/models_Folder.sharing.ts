import { setupDatabaseAndSynchronizer, switchClient, createFolderTree } from './test-utils';
import Folder from '@joplin/lib/models/Folder';
import { allNotesFolders } from './test-utils-synchronizer';
import Note from '@joplin/lib/models/Note';
import shim from '@joplin/lib/shim';
import Resource from '@joplin/lib/models/Resource';
import { FolderEntity, NoteEntity, ResourceEntity } from '@joplin/lib/services/database/types';
import ResourceService from '@joplin/lib/services/ResourceService';

const testImagePath = `${__dirname}/../tests/support/photo.jpg`;

describe('models_Folder.sharing', function() {

	beforeEach(async (done) => {
		await setupDatabaseAndSynchronizer(1);
		await switchClient(1);
		done();
	});

	it('should apply the share ID to all children', (async () => {
		const folder = await createFolderTree('', [
			{
				title: 'folder 1',
				children: [
					{
						title: 'note 1',
					},
					{
						title: 'note 2',
					},
					{
						title: 'folder 2',
						children: [
							{
								title: 'note 3',
							},
						],
					},
				],
			},
		]);

		await Folder.save({ id: folder.id, share_id: 'abcd1234' });
		await Folder.updateAllShareIds();

		const allItems = await allNotesFolders();
		for (const item of allItems) {
			expect(item.share_id).toBe('abcd1234');
		}
	}));

	it('should apply the share ID to all sub-folders', (async () => {
		let folder1 = await createFolderTree('', [
			{
				title: 'folder 1',
				children: [
					{
						title: 'note 1',
					},
					{
						title: 'note 2',
					},
					{
						title: 'folder 2',
						children: [
							{
								title: 'note 3',
							},
						],
					},
					{
						title: 'folder 3',
						children: [
							{
								title: 'folder 4',
								children: [],
							},
						],
					},
				],
			},
			{
				title: 'folder 5',
				children: [],
			},
		]);

		await Folder.save({ id: folder1.id, share_id: 'abcd1234' });

		await Folder.updateAllShareIds();

		folder1 = await Folder.loadByTitle('folder 1');
		const folder2 = await Folder.loadByTitle('folder 2');
		const folder3 = await Folder.loadByTitle('folder 3');
		const folder4 = await Folder.loadByTitle('folder 4');
		const folder5 = await Folder.loadByTitle('folder 5');

		expect(folder1.share_id).toBe('abcd1234');
		expect(folder2.share_id).toBe('abcd1234');
		expect(folder3.share_id).toBe('abcd1234');
		expect(folder4.share_id).toBe('abcd1234');
		expect(folder5.share_id).toBe('');
	}));

	it('should update the share ID when a folder is moved in or out of shared folder', (async () => {
		let folder1 = await createFolderTree('', [
			{
				title: 'folder 1',
				children: [
					{
						title: 'folder 2',
						children: [],
					},
				],
			},
			{
				title: 'folder 3',
				children: [],
			},
		]);

		await Folder.save({ id: folder1.id, share_id: 'abcd1234' });

		await Folder.updateAllShareIds();

		folder1 = await Folder.loadByTitle('folder 1');
		let folder2 = await Folder.loadByTitle('folder 2');
		const folder3 = await Folder.loadByTitle('folder 3');

		expect(folder1.share_id).toBe('abcd1234');
		expect(folder2.share_id).toBe('abcd1234');

		// Move the folder outside the shared folder

		await Folder.save({ id: folder2.id, parent_id: folder3.id });
		await Folder.updateAllShareIds();
		folder2 = await Folder.loadByTitle('folder 2');
		expect(folder2.share_id).toBe('');

		// Move the folder inside the shared folder

		{
			await Folder.save({ id: folder2.id, parent_id: folder1.id });
			await Folder.updateAllShareIds();
			folder2 = await Folder.loadByTitle('folder 2');
			expect(folder2.share_id).toBe('abcd1234');
		}
	}));

	it('should apply the share ID to all notes', (async () => {
		const folder1 = await createFolderTree('', [
			{
				title: 'folder 1',
				children: [
					{
						title: 'note 1',
					},
					{
						title: 'note 2',
					},
					{
						title: 'folder 2',
						children: [
							{
								title: 'note 3',
							},
						],
					},
				],
			},
			{
				title: 'folder 5',
				children: [
					{
						title: 'note 4',
					},
				],
			},
		]);

		await Folder.save({ id: folder1.id, share_id: 'abcd1234' });

		await Folder.updateAllShareIds();

		const note1: NoteEntity = await Note.loadByTitle('note 1');
		const note2: NoteEntity = await Note.loadByTitle('note 2');
		const note3: NoteEntity = await Note.loadByTitle('note 3');
		const note4: NoteEntity = await Note.loadByTitle('note 4');

		expect(note1.share_id).toBe('abcd1234');
		expect(note2.share_id).toBe('abcd1234');
		expect(note3.share_id).toBe('abcd1234');
		expect(note4.share_id).toBe('');
	}));

	it('should remove the share ID when a note is moved in or out of shared folder', (async () => {
		const folder1 = await createFolderTree('', [
			{
				title: 'folder 1',
				children: [
					{
						title: 'note 1',
					},
				],
			},
			{
				title: 'folder 2',
				children: [],
			},
		]);

		await Folder.save({ id: folder1.id, share_id: 'abcd1234' });
		await Folder.updateAllShareIds();
		const note1: NoteEntity = await Note.loadByTitle('note 1');
		const folder2: FolderEntity = await Folder.loadByTitle('folder 2');
		expect(note1.share_id).toBe('abcd1234');

		// Move the note outside of the shared folder

		await Note.save({ id: note1.id, parent_id: folder2.id });
		await Folder.updateAllShareIds();

		{
			const note1: NoteEntity = await Note.loadByTitle('note 1');
			expect(note1.share_id).toBe('');
		}

		// Move the note back inside the shared folder

		await Note.save({ id: note1.id, parent_id: folder1.id });
		await Folder.updateAllShareIds();

		{
			const note1: NoteEntity = await Note.loadByTitle('note 1');
			expect(note1.share_id).toBe('abcd1234');
		}
	}));

	it('should not remove the share ID of non-modified notes', (async () => {
		const folder1 = await createFolderTree('', [
			{
				title: 'folder 1',
				children: [
					{
						title: 'note 1',
					},
					{
						title: 'note 2',
					},
				],
			},
			{
				title: 'folder 2',
				children: [],
			},
		]);

		await Folder.save({ id: folder1.id, share_id: 'abcd1234' });
		await Folder.updateAllShareIds();

		let note1: NoteEntity = await Note.loadByTitle('note 1');
		let note2: NoteEntity = await Note.loadByTitle('note 2');
		const folder2: FolderEntity = await Folder.loadByTitle('folder 2');

		expect(note1.share_id).toBe('abcd1234');
		expect(note2.share_id).toBe('abcd1234');

		await Note.save({ id: note1.id, parent_id: folder2.id });
		await Folder.updateAllShareIds();

		note1 = await Note.loadByTitle('note 1');
		note2 = await Note.loadByTitle('note 2');
		expect(note1.share_id).toBe('');
		expect(note2.share_id).toBe('abcd1234');
	}));

	it('should apply the note share ID to its resources', async () => {
		const resourceService = new ResourceService();

		const folder = await createFolderTree('', [
			{
				title: 'folder 1',
				children: [
					{
						title: 'note 1',
					},
					{
						title: 'note 2',
					},
				],
			},
			{
				title: 'folder 2',
				children: [],
			},
		]);

		await Folder.save({ id: folder.id, share_id: 'abcd1234' });
		await Folder.updateAllShareIds();

		const folder2: FolderEntity = await Folder.loadByTitle('folder 2');
		const note1: NoteEntity = await Note.loadByTitle('note 1');
		await shim.attachFileToNote(note1, testImagePath);

		// We need to index the resources to populate the note_resources table
		await resourceService.indexNoteResources();

		const resourceId: string = (await Resource.all())[0].id;

		{
			const resource: ResourceEntity = await Resource.load(resourceId);
			expect(resource.share_id).toBe('');
		}

		await Folder.updateAllShareIds();

		// await NoteResource.updateResourceShareIds();

		{
			const resource: ResourceEntity = await Resource.load(resourceId);
			expect(resource.share_id).toBe(note1.share_id);
		}

		await Note.save({ id: note1.id, parent_id: folder2.id });
		await resourceService.indexNoteResources();

		await Folder.updateAllShareIds();

		// await NoteResource.updateResourceShareIds();

		{
			const resource: ResourceEntity = await Resource.load(resourceId);
			expect(resource.share_id).toBe('');
		}
	});

	// it('should not recursively delete when non-owner deletes a shared folder', async () => {
	// 	const folder = await createFolderTree('', [
	// 		{
	// 			title: 'folder 1',
	// 			children: [
	// 				{
	// 					title: 'note 1',
	// 				},
	// 			],
	// 		},
	// 	]);

	// 	BaseItem.shareService_ = {
	// 		isSharedFolderOwner: (_folderId: string) => false,
	// 	} as any;

	// 	await Folder.save({ id: folder.id, share_id: 'abcd1234' });
	// 	await Folder.updateAllShareIds();

	// 	await Folder.delete(folder.id);

	// 	expect((await Folder.all()).length).toBe(0);
	// 	expect((await Note.all()).length).toBe(1);
	// });

});
