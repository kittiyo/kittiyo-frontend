<template>
  <main class="app-shell space-y-6">
    <section class="surface-panel grid gap-8 overflow-hidden p-6 lg:grid-cols-[1.3fr_0.9fr] lg:p-10">
      <div class="space-y-6">
        <div class="space-y-3">
          <p class="eyebrow">Face Search Gallery</p>
          <h1 class="page-title">PicDrop</h1>
          <p class="max-w-2xl text-base leading-7 text-slate-600 sm:text-lg">
            A gallery workspace for event teams: connect Drive, sync photos, collect face scans,
            and return a private result wall for each attendee without building a custom delivery flow every time.
          </p>
        </div>

        <div class="flex flex-wrap gap-3">
          <RouterLink to="/admin">
            <Button label="Open Admin Panel" icon="pi pi-th-large" />
          </RouterLink>
          <RouterLink :to="demoGuestPath">
            <Button label="Try Personal Link" severity="secondary" outlined icon="pi pi-camera" />
          </RouterLink>
          <RouterLink :to="demoCommonPath">
            <Button label="Try Common Link" severity="secondary" outlined icon="pi pi-images" />
          </RouterLink>
        </div>

        <div class="flex flex-wrap gap-2">
          <Tag value="PrimeVue" severity="info" rounded />
          <Tag value="TailwindCSS" severity="contrast" rounded />
          <Tag value="Google Drive Sync" severity="success" rounded />
          <Tag value="Face Matching" severity="warn" rounded />
        </div>
      </div>

      <div class="grid gap-4">
        <Card class="surface-muted">
          <template #content>
            <div class="space-y-3">
              <p class="eyebrow">Admin Flow</p>
              <h2 class="section-title">Build one gallery workspace</h2>
              <p class="helper-copy">Create the gallery, connect Drive, refresh the common PIN, upload a header banner, and manage scanned people from one admin view.</p>
            </div>
          </template>
        </Card>
        <Card class="surface-muted">
          <template #content>
            <div class="space-y-3">
              <p class="eyebrow">Guest Flow</p>
              <h2 class="section-title">Scan, register, open results</h2>
              <p class="helper-copy">Guests use the personal link to scan their face, create a profile if needed, and open a private gallery grid with direct downloads.</p>
            </div>
          </template>
        </Card>
      </div>
    </section>

    <section class="grid gap-4 lg:grid-cols-3">
      <Card class="surface-panel">
        <template #content>
          <div class="space-y-3">
            <p class="eyebrow">Frontend</p>
            <h2 class="section-title">Vue + PrimeVue</h2>
            <p class="helper-copy">The client handles camera capture, gallery routing, modal previews, admin workflow, and fast state refresh after every mutation.</p>
          </div>
        </template>
      </Card>
      <Card class="surface-panel">
        <template #content>
          <div class="space-y-3">
            <p class="eyebrow">Backend</p>
            <h2 class="section-title">Drive + Face Indexing</h2>
            <p class="helper-copy">Express syncs Drive images, stores face encodings, compares scans against known people, and returns only the relevant gallery results.</p>
          </div>
        </template>
      </Card>
      <Card class="surface-panel">
        <template #content>
          <div class="space-y-3">
            <p class="eyebrow">Output</p>
            <h2 class="section-title">Delivery-Ready</h2>
            <p class="helper-copy">Common link access, personal galleries, direct Drive downloads, and admin review are already wired into the same product surface.</p>
          </div>
        </template>
      </Card>
    </section>
  </main>
</template>

<script setup>
import Button from "primevue/button";
import Card from "primevue/card";
import Tag from "primevue/tag";

const demoGuestPath = "/g/demo-gallery";
const demoCommonPath = "/g/demo-gallery/all";
</script>
