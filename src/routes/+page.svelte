<script>
	// @ts-nocheck
	import { onMount } from 'svelte';
	/**@type {HTMLCanvasElement}*/
	let appView;
	let app;
	let loaded = false;
	let isAdd = false;
	let addInput;
	let addValue = '';
	let pickedPoint;
	let selected = null;
	let inputError = false;
	let comments = {};
	const selectPoint = (name) => {
		selected = Number(name);
		app.selectPoint(selected);
	};
	onMount(async () => {
		const { App } = await import('$lib/babylon');
		app = new App(appView);
		app.onHit((hit, ev) => {
			pickedPoint = hit.pickedPoint;
			const { pickedMesh } = hit;
			if (!pickedMesh) return;
			if (ev.button == 0) {
				if (pickedMesh.id === 'point') {
					selectPoint(pickedMesh.name);
				} else {
					selected = null;
					app.removeSelectedPoint();
				}
			}
			if (ev.button == 2) {
				if (app.isCurrentMesh(pickedMesh)) openAdd(); //
				if (pickedMesh.id === 'point') {
					// app.rmPoint(pickedMesh.name);
				}
			}
		});
	});
	const onUpload = (event) => {
		comments = {};
		loaded = true;
		app.loadFile(event);
	};
	function openAdd() {
		isAdd = true;
		// addInput.focus();
		console.log(addInput);
	}
	const cancelAdd = () => {
		isAdd = false;
		inputError = false;
	};
	const doAdd = () => {
		if (addValue == '') return (inputError = true);
		inputError = false;
		let id = app.addPoint(...pickedPoint.asArray());
		comments[id] = addValue;
		addValue = '';
		cancelAdd();
	};
	const centerPoint = () => {
		app.lookAtPoint(selected);
	};
	const rmPoint = () => {
		app.rmPoint(selected);
		delete comments[selected];
		comments = comments;
		selected = null;
	};
</script>

{#if !loaded}
	<div class="fixed bottom-[50px] right-[10px]">
		<label for="loadStl" class=" bg-black p-2 text-white px-4 uppercase cursor-pointer">
			<span class="border p-1 hover:bg-white hover:bg-opacity-20">Upload .stl</span>
			<input type="file" id="loadStl" class="hidden" accept=".stl" on:change={onUpload} />
		</label>
	</div>
{/if}
{#if typeof selected === 'number'}
	<div class="fixed top-[100px] right-[10px] bg-black text-white p-2 px-3 flex flex-col">
		<span class="text-center mb-1">point {selected}</span>
		<div class="text-sm border-b mb-1">description</div>
		<div>{comments[selected]}</div>
		<button
			class="border p-0.5 px-3 mt-2 text-xs"
			on:click={() => {
				centerPoint();
			}}>center</button
		>
		<button class="border p-0.5 px-3 mt-2 text-xs" on:click={() => rmPoint()}>remove</button>
	</div>
{/if}

<div class="fixed left-[10px] bottom-[10px] bg-black text-white p-1 px-3 text-xs">
	mouse - rotate <br />
	ctrl + mouse - drag <br />
	left mouse - select point <br />
	right mouse - add point <br />
	<a href="//github.com/FlokiTV" target="_blank">by Dawyson Wüster</a>
</div>
<div class="fixed left-[10px] top-[10px] bg-black text-white p-1 px-3 text-xs flex flex-col gap-1">
	<span>point list</span>
	{#each Object.keys(comments) as i}
		<!-- svelte-ignore a11y-click-events-have-key-events -->
		<!-- svelte-ignore a11y-no-static-element-interactions -->
		<span
			on:click={() => selectPoint(i)}
			class="p-1 px-2 border {selected == i
				? 'bg-green-400'
				: ''} hover:bg-white hover:bg-opacity-50 bg-opacity-50 cursor-pointer">[{i}] point</span
		>
	{/each}
</div>
{#if isAdd}
	<!-- svelte-ignore a11y-click-events-have-key-events -->
	<!-- svelte-ignore a11y-no-static-element-interactions -->
	<div
		on:contextmenu={(ev) => ev.preventDefault()}
		class="fixed top-[0px] right-[0px] bottom-0 left-0 text-white p-2 px-3 flex items-center justify-center backdrop-blur-sm"
	>
		<div class="bg-black p-2 flex flex-col">
			<span class="text-center">add point</span>
			description
			<input
				type="text"
				class="border bg-transparent p-1 {inputError ? 'border-red-700' : ''}"
				bind:value={addValue}
				bind:this={addInput}
			/>
			<div class="flex justify-end mt-1 gap-1">
				<button class="border p-0.5 px-3" on:click={() => cancelAdd()}>cancel</button>
				<button class="border p-0.5 px-3" on:click={() => doAdd()}>add</button>
			</div>
		</div>
	</div>
{/if}
<canvas class="w-full h-full" bind:this={appView} />
