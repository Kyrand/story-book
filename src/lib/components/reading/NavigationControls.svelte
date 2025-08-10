<script>
	let { 
		store,
		sessionData,
		onChangePage = () => {}
	} = $props();
	
	async function changePage(direction) {
		const newPage = store.currentPage + direction;
		
		if (newPage < 1 || newPage > store.pageContent.totalPages) return;
		
		store.currentPage = newPage;
		
		// Load new page content
		const response = await fetch(`/api/books/${sessionData.session.book_id}/page/${newPage}`);
		if (response.ok) {
			store.pageContent = await response.json();
			
			// Update session progress
			await fetch(`/api/sessions/${sessionData.session.id}/progress`, {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ currentPage: newPage })
			});
			
			// Notify parent component
			onChangePage(newPage);
		}
	}
</script>

<!-- Navigation Controls -->
<div class="fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg">
	<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 sm:py-4">
		<div class="flex justify-between items-center">
			<!-- Left navigation zone -->
			<button
				onclick={() => changePage(-1)}
				disabled={store.currentPage <= 1}
				class="px-3 sm:px-6 py-2 sm:py-3 text-sm sm:text-base bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
			>
				<span class="hidden sm:inline">← Previous Page</span>
				<span class="sm:hidden">← Prev</span>
			</button>
			
			<!-- Page indicator -->
			<div class="text-center">
				<span class="text-xs sm:text-sm text-gray-600">
					{store.currentPage} / {store.pageContent?.totalPages || '?'}
				</span>
			</div>
			
			<!-- Right navigation zone -->
			<button
				onclick={() => changePage(1)}
				disabled={store.currentPage >= (store.pageContent?.totalPages || 0)}
				class="px-3 sm:px-6 py-2 sm:py-3 text-sm sm:text-base bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
			>
				<span class="hidden sm:inline">Next Page →</span>
				<span class="sm:hidden">Next →</span>
			</button>
		</div>
	</div>
</div>

<!-- Add padding to prevent content from being hidden behind fixed navigation -->
<div class="h-20"></div>