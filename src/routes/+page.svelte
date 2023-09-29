<script>
	// @ts-nocheck
	import { onMount } from 'svelte';
	/**@type {HTMLCanvasElement}*/
	let appView;
	let app;
	let loaded = false;
	onMount(async () => {
		const { App } = await import('$lib/babylon');
		app = new App(appView);
		app.onHit((hit, ev) => {
			const { pickedMesh, pickedPoint } = hit;
			if (!pickedMesh) return;
			if (ev.button == 0) {
				if (pickedMesh.id === 'point') {
					alert(pickedMesh.name);
				}
			}
			if (ev.button == 2) {
				if (app.isCurrentMesh(pickedMesh)) app.addPoint(...pickedPoint.asArray());
				if (pickedMesh.id === 'point') {
					// app.rmPoint(pickedMesh.name);
					app.lookAtPoint(pickedMesh.name);
				}
			}
		});
	});
	const onUpload = (event) => {
		console.log(event);
		loaded = true;
		app.loadFile(event);
	};
</script>

{#if !loaded}
	<div class="fixed bottom-[10px] right-[10px]">
		<input type="file" id="loadStl" on:change={onUpload} />
	</div>
{/if}
<div class="fixed top-[10px] right-[10px] bg-black text-white p-2 px-3">points</div>
<div class="fixed left-[10px] bottom-[10px] bg-black text-white p-1 px-3 text-xs">
	mouse - rotate <br />
	ctrl + mouse - drag <br />
	left mouse - select point <br />
	right mouse - add point <br />
</div>
<div class="fixed top-[10px] right-[10px] bg-black text-white p-2 px-3">points</div>
<canvas class="w-full h-full" bind:this={appView} />
