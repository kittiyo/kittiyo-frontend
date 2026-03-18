<template>
  <main class="app-shell">
    <Card v-if="!authReady" class="surface-panel">
      <template #content>
        <div class="space-y-3">
          <p class="eyebrow">Authentication</p>
          <h1 class="section-title">Checking your session</h1>
          <p class="helper-copy">Verifying whether you already have an active admin login.</p>
        </div>
      </template>
    </Card>

    <Card v-else-if="!session" class="surface-panel">
      <template #content>
        <div class="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div class="space-y-3">
            <p class="eyebrow">Admin Access</p>
            <h1 class="page-title !text-4xl">Sign in to manage PicDrop</h1>
            <p class="max-w-2xl text-base leading-7 text-slate-600">
              Admin access is protected with Google sign-in. Use it to create galleries, sync Drive folders,
              upload headers, refresh common PINs, and review scanned people.
            </p>
          </div>

          <div class="flex flex-wrap gap-3">
            <RouterLink to="/">
              <Button label="Overview" severity="secondary" outlined icon="pi pi-home" />
            </RouterLink>
            <Button label="Continue with Google" icon="pi pi-google" :loading="authBusy" @click="login" />
          </div>
        </div>
      </template>
    </Card>

    <template v-else>
      <div class="grid gap-6 xl:grid-cols-[19rem_minmax(0,1fr)]">
        <aside class="space-y-6 xl:sticky xl:top-6 xl:self-start">
          <Card class="surface-panel">
            <template #content>
              <div class="space-y-5">
                <div class="space-y-2">
                  <p class="eyebrow">Admin Workspace</p>
                  <h1 class="section-title">PicDrop</h1>
                  <p class="helper-copy">Signed in as <strong>{{ session.user?.email || "Unknown account" }}</strong></p>
                </div>

                <div class="flex flex-wrap gap-2">
                  <Tag :value="`${galleries.length} galleries`" severity="contrast" rounded />
                  <Tag :value="`${photos.length} photos`" severity="info" rounded />
                  <Tag :value="`${guests.length} people`" severity="success" rounded />
                </div>

                <div class="flex flex-wrap gap-3">
                  <RouterLink to="/">
                    <Button label="Overview" severity="secondary" outlined size="small" icon="pi pi-home" />
                  </RouterLink>
                  <Button label="Sign Out" severity="secondary" outlined size="small" icon="pi pi-sign-out" :loading="authBusy" @click="logout" />
                </div>
              </div>
            </template>
          </Card>

          <Card class="surface-panel">
            <template #content>
              <div class="space-y-4">
                <div class="space-y-2">
                  <p class="eyebrow">Navigate</p>
                  <h2 class="section-title !text-xl">Jump to a section</h2>
                </div>

                <div class="grid gap-2">
                  <button
                    v-for="section in workspaceSections"
                    :key="section.id"
                    type="button"
                    class="surface-muted flex items-start justify-between gap-3 p-4 text-left transition hover:border-sky-200"
                    @click="scrollToSection(section.id)"
                  >
                    <div>
                      <p class="text-sm font-semibold text-slate-900">{{ section.label }}</p>
                      <p class="mt-1 text-xs leading-5 text-slate-500">{{ section.caption }}</p>
                    </div>
                    <i class="pi pi-arrow-right text-slate-400"></i>
                  </button>
                </div>
              </div>
            </template>
          </Card>

          <Card class="surface-panel">
            <template #content>
              <div class="space-y-4">
                <div class="space-y-2">
                  <p class="eyebrow">Gallery Library</p>
                  <h2 class="section-title !text-xl">Select gallery</h2>
                </div>

                <div v-if="galleries.length" class="grid gap-2">
                  <button
                    v-for="gallery in galleries"
                    :key="gallery.id"
                    type="button"
                    class="rounded-2xl border px-4 py-3 text-left transition"
                    :class="gallery.id === selectedGallery?.id ? 'border-sky-300 bg-sky-50' : 'border-slate-200 bg-white hover:border-slate-300'"
                    @click="setActiveGallery(gallery.id)"
                  >
                    <p class="text-sm font-semibold text-slate-900">{{ gallery.title }}</p>
                    <p class="mt-1 text-xs uppercase tracking-[0.2em] text-slate-500">{{ gallery.slug }}</p>
                    <p class="mt-2 text-xs text-slate-500">{{ galleryPhotoCount(gallery.id) }} photos</p>
                  </button>
                </div>
                <div v-else class="surface-muted p-4 text-sm text-slate-500">Create your first gallery to unlock the admin workspace.</div>
              </div>
            </template>
          </Card>

          <div class="space-y-3">
            <Message v-if="feedback" severity="success" :closable="false">{{ feedback }}</Message>
            <Message v-if="error" severity="error" :closable="false">{{ error }}</Message>
          </div>
        </aside>

        <section class="space-y-6">
          <Card class="surface-panel overflow-hidden">
            <template #content>
              <div class="space-y-6">
                <div class="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
                  <div class="space-y-3">
                    <p class="eyebrow">Selected Gallery</p>
                    <h2 class="page-title !text-4xl">{{ selectedGallery?.title || "Create a gallery" }}</h2>
                    <p class="max-w-3xl text-base leading-7 text-slate-600">
                      {{
                        selectedGallery
                          ? "A single workspace for gallery settings, header image management, Drive sync, people, and image review."
                          : "Start by creating a gallery and connecting its Google Drive folder."
                      }}
                    </p>
                  </div>

                  <div v-if="selectedGallery" class="flex flex-wrap gap-3">
                    <Button
                      label="Delete Gallery"
                      severity="danger"
                      outlined
                      icon="pi pi-trash"
                      :loading="saving.deleteGalleryId === selectedGallery.id"
                      @click="removeGallery(selectedGallery)"
                    />
                    <Button
                      :label="selectedGallery.hasDriveConnection ? 'Reconnect Drive' : 'Connect Drive'"
                      icon="pi pi-link"
                      :loading="saving.connectDriveId === selectedGallery.id"
                      @click="connectDrive(selectedGallery)"
                    />
                    <Button
                      label="Sync Drive"
                      icon="pi pi-refresh"
                      :loading="saving.syncGalleryId === selectedGallery.id"
                      :disabled="!selectedGallery.hasDriveConnection"
                      @click="syncDriveGallery(selectedGallery)"
                    />
                  </div>
                </div>

                <div v-if="selectedGallery" class="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                  <div class="surface-muted p-4">
                    <p class="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Photos</p>
                    <p class="mt-2 text-2xl font-semibold text-slate-950">{{ galleryPhotoCount(selectedGallery.id) }}</p>
                  </div>
                  <div class="surface-muted p-4">
                    <p class="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">People</p>
                    <p class="mt-2 text-2xl font-semibold text-slate-950">{{ galleryGuestCount(selectedGallery.id) }}</p>
                  </div>
                  <div class="surface-muted p-4">
                    <p class="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Indexed Photos</p>
                    <p class="mt-2 text-2xl font-semibold text-slate-950">{{ galleryIndexedPhotoCount(selectedGallery.id) }}</p>
                  </div>
                  <div class="surface-muted p-4">
                    <p class="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Drive Connected</p>
                    <p class="mt-2 text-2xl font-semibold text-slate-950">{{ selectedGallery.hasDriveConnection ? "Yes" : "No" }}</p>
                  </div>
                </div>

                <div v-if="selectedGallery" class="grid gap-3 lg:grid-cols-2 2xl:grid-cols-5">
                  <div class="surface-muted p-4">
                    <p class="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Personal URL</p>
                    <p class="mt-2 break-all text-sm text-slate-700">{{ personalUrl(selectedGallery.slug) }}</p>
                    <RouterLink :to="`/g/${selectedGallery.slug}`" class="mt-3 inline-block">
                      <Button label="Open" severity="secondary" outlined size="small" />
                    </RouterLink>
                  </div>
                  <div class="surface-muted p-4">
                    <p class="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Common URL</p>
                    <p class="mt-2 break-all text-sm text-slate-700">{{ commonUrl(selectedGallery.slug) }}</p>
                    <RouterLink :to="`/g/${selectedGallery.slug}/all`" class="mt-3 inline-block">
                      <Button label="Open" severity="secondary" outlined size="small" />
                    </RouterLink>
                  </div>
                  <div class="surface-muted p-4">
                    <p class="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Common PIN</p>
                    <p class="mt-2 text-3xl font-semibold tracking-[0.4em] text-slate-950">{{ selectedGallery.commonAccessPin || "----" }}</p>
                    <Button
                      label="Refresh PIN"
                      severity="secondary"
                      outlined
                      size="small"
                      class="mt-3"
                      :loading="saving.refreshPinGalleryId === selectedGallery.id"
                      @click="refreshPin(selectedGallery)"
                    />
                  </div>
                  <div class="surface-muted p-4 lg:col-span-2">
                    <p class="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Drive Folder</p>
                    <a :href="selectedGallery.driveLink" target="_blank" rel="noreferrer" class="mt-2 block break-all text-sm text-sky-700">
                      {{ selectedGallery.driveLink }}
                    </a>
                  </div>
                  <div class="surface-muted p-4 lg:col-span-2 2xl:col-span-5">
                    <div class="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                      <div class="space-y-2">
                        <p class="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Header Image</p>
                        <p class="text-sm text-slate-600">Upload a banner image to brand the personal link and common gallery pages.</p>
                      </div>
                      <label class="inline-flex cursor-pointer">
                        <input hidden type="file" accept="image/*" :disabled="saving.headerImageGalleryId === selectedGallery.id" @change="uploadHeaderImage($event, selectedGallery)" />
                        <Button
                          :label="saving.headerImageGalleryId === selectedGallery.id ? 'Uploading...' : selectedGallery.headerImageUrl ? 'Replace Header Image' : 'Upload Header Image'"
                          severity="secondary"
                          outlined
                          icon="pi pi-image"
                          :loading="saving.headerImageGalleryId === selectedGallery.id"
                        />
                      </label>
                    </div>
                    <img
                      v-if="selectedGallery.headerImageUrl"
                      :src="selectedGallery.headerImageUrl"
                      :alt="`${selectedGallery.title} header`"
                      class="mt-4 h-48 w-full rounded-2xl border border-slate-200 object-cover"
                    />
                  </div>
                </div>
              </div>
            </template>
          </Card>

          <Card id="gallery-setup" class="surface-panel">
            <template #content>
              <div class="space-y-6">
                <div class="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div class="space-y-2">
                    <p class="eyebrow">Step 1</p>
                    <h2 class="section-title">Gallery Setup</h2>
                    <p class="helper-copy">Create a new gallery or preload the selected one into the form to update it.</p>
                  </div>
                  <Button
                    v-if="selectedGallery"
                    label="Load Selected Gallery"
                    severity="secondary"
                    outlined
                    icon="pi pi-pencil"
                    @click="populateGalleryForm(selectedGallery)"
                  />
                </div>

                <form class="grid gap-4 md:grid-cols-2" @submit.prevent="submitGallery">
                  <div class="space-y-2">
                    <label class="text-sm font-medium text-slate-700">Gallery name</label>
                    <InputText v-model.trim="galleryForm.title" required placeholder="Annual Day 2026" />
                  </div>
                  <div class="space-y-2">
                    <label class="text-sm font-medium text-slate-700">Public slug</label>
                    <InputText v-model.trim="galleryForm.slug" required placeholder="annual-day-2026" />
                  </div>
                  <div class="space-y-2 md:col-span-2">
                    <label class="text-sm font-medium text-slate-700">Shared Google Drive folder link</label>
                    <InputText v-model.trim="galleryForm.driveLink" required type="url" placeholder="https://drive.google.com/drive/folders/..." />
                  </div>
                  <div class="flex items-center gap-3 md:col-span-2">
                    <Checkbox v-model="galleryForm.isPublic" binary input-id="gallery-public" />
                    <label for="gallery-public" class="text-sm text-slate-700">Public link enabled</label>
                  </div>
                  <div class="md:col-span-2">
                    <Button :label="saving.gallery ? 'Saving...' : 'Save Gallery'" :loading="saving.gallery" type="submit" />
                  </div>
                </form>
              </div>
            </template>
          </Card>

          <Card id="guest-library" class="surface-panel">
            <template #content>
              <div class="space-y-6">
                <div class="space-y-2">
                  <p class="eyebrow">Step 2</p>
                  <h2 class="section-title">People and Reference Scans</h2>
                  <p class="helper-copy">Add manual reference anchors when you need curated people or extra selfie images for a gallery.</p>
                </div>

                <form class="grid gap-4 md:grid-cols-2" @submit.prevent="submitGuest">
                  <div class="space-y-2">
                    <label class="text-sm font-medium text-slate-700">Name</label>
                    <InputText v-model.trim="guestForm.name" required placeholder="Nihal" />
                  </div>
                  <div class="space-y-2">
                    <label class="text-sm font-medium text-slate-700">Gallery</label>
                    <Select v-model="guestForm.galleryId" :options="galleries" optionLabel="title" optionValue="id" placeholder="Select a gallery" />
                  </div>
                  <div class="space-y-2 md:col-span-2">
                    <label class="text-sm font-medium text-slate-700">Reference selfie</label>
                    <input type="file" accept="image/*" class="block w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600" @change="handleGuestFile" />
                  </div>
                  <div class="md:col-span-2">
                    <Button :label="saving.guest ? 'Adding Reference...' : 'Add Reference'" :loading="saving.guest" type="submit" />
                  </div>
                </form>

                <div v-if="selectedGalleryGuests.length" class="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                  <div v-for="guest in selectedGalleryGuests" :key="guest.id" class="surface-muted flex items-center gap-4 p-4">
                    <img
                      v-if="guest.referenceImageUrl"
                      :src="guest.referenceImageUrl"
                      :alt="`${guest.name} reference`"
                      class="h-14 w-14 rounded-full border border-slate-200 object-cover"
                    />
                    <div v-else class="grid h-14 w-14 place-items-center rounded-full border border-slate-200 bg-white text-sm font-semibold text-slate-600">
                      {{ guest.name.slice(0, 1).toUpperCase() }}
                    </div>
                    <div>
                      <p class="text-sm font-semibold text-slate-900">{{ guest.name }}</p>
                      <p class="text-xs text-slate-500">{{ guest.selfieCount || 0 }} {{ guest.selfieCount === 1 ? "selfie" : "selfies" }}</p>
                    </div>
                  </div>
                </div>
                <div v-else class="surface-muted p-4 text-sm text-slate-500">
                  {{ selectedGallery ? "No people or reference scans added for this gallery yet." : "Select or create a gallery first." }}
                </div>
              </div>
            </template>
          </Card>

          <Card id="photo-sources" class="surface-panel">
            <template #content>
              <div class="space-y-6">
                <div class="space-y-2">
                  <p class="eyebrow">Step 3</p>
                  <h2 class="section-title">Photo Sources</h2>
                  <p class="helper-copy">Drive sync is the main ingestion path. Manual entries help when you need one image mapped immediately.</p>
                </div>

                <form class="grid gap-4 md:grid-cols-2" @submit.prevent="submitPhoto">
                  <div class="space-y-2">
                    <label class="text-sm font-medium text-slate-700">Gallery</label>
                    <Select v-model="photoForm.galleryId" :options="galleries" optionLabel="title" optionValue="id" placeholder="Select a gallery" />
                  </div>
                  <div class="space-y-2">
                    <label class="text-sm font-medium text-slate-700">Photo label</label>
                    <InputText v-model.trim="photoForm.title" required placeholder="Stage photo 014" />
                  </div>
                  <div class="space-y-2 md:col-span-2">
                    <label class="text-sm font-medium text-slate-700">Google Drive file link</label>
                    <InputText v-model.trim="photoForm.driveLink" required type="url" placeholder="https://drive.google.com/file/d/.../view" />
                  </div>
                  <div class="space-y-2">
                    <label class="text-sm font-medium text-slate-700">Captured on</label>
                    <InputText v-model="photoForm.capturedAt" type="date" />
                  </div>
                  <div class="space-y-2">
                    <label class="text-sm font-medium text-slate-700">Tagged people</label>
                    <MultiSelect
                      v-model="photoForm.guestIds"
                      :options="photoGuests"
                      optionLabel="name"
                      optionValue="id"
                      display="chip"
                      placeholder="Select tagged people"
                    />
                  </div>
                  <div class="md:col-span-2">
                    <Button :label="saving.photo ? 'Adding Photo...' : 'Add Manual Photo'" :loading="saving.photo" type="submit" />
                  </div>
                </form>
              </div>
            </template>
          </Card>

          <Card id="gallery-view" class="surface-panel">
            <template #content>
              <div class="space-y-6">
                <div class="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div class="space-y-2">
                    <p class="eyebrow">Gallery View</p>
                    <h2 class="section-title">{{ selectedGallery?.title || "Photo Library" }}</h2>
                    <p class="helper-copy">Open an image, inspect it in full size, and download the original directly from Google Drive.</p>
                  </div>
                  <div v-if="selectedGalleryPhotos.length" class="flex flex-wrap gap-2">
                    <Tag :value="`${selectedGalleryPhotos.length} images`" severity="contrast" rounded />
                    <Tag :value="`${galleryIndexedPhotoCount(selectedGallery.id)} indexed`" severity="info" rounded />
                  </div>
                </div>

                <div v-if="selectedGalleryPhotos.length" class="gallery-grid">
                  <button
                    v-for="photo in selectedGalleryPhotos"
                    :key="photo.id"
                    type="button"
                    @click="openPhoto(photo)"
                  >
                    <img :src="photo.storageImageUrl || photo.thumbnailUrl" :alt="photo.title" />
                  </button>
                </div>
                <div v-else class="surface-muted p-4 text-sm text-slate-500">
                  {{ selectedGallery ? "No images are mapped to this gallery yet." : "Create a gallery to start building its image library." }}
                </div>
              </div>
            </template>
          </Card>
        </section>
      </div>
    </template>

    <Dialog
      :visible="Boolean(activePhoto)"
      modal
      dismissableMask
      :header="''"
      :style="{ width: 'min(96vw, 88rem)' }"
      :contentStyle="{ padding: '0' }"
      @update:visible="closePhoto"
    >
      <div v-if="activePhoto" class="flex h-[86vh] max-h-[86vh] flex-col overflow-hidden">
        <div class="flex-1 p-3 sm:p-4">
          <div class="surface-muted flex h-full w-full items-center justify-center overflow-hidden p-2 sm:p-3">
            <img
              :src="activePhoto.storageImageUrl || activePhoto.thumbnailUrl"
              :alt="activePhoto.title"
              class="h-full w-full rounded-[20px] object-contain"
            />
          </div>
        </div>

        <div class="border-t border-slate-200 bg-white px-4 py-4 sm:px-6">
          <div class="flex flex-wrap items-center justify-between gap-3">
            <p class="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
              {{ currentPhotoPositionLabel }}
            </p>
            <div class="flex flex-wrap justify-end gap-3">
              <Button label="Previous" severity="secondary" outlined icon="pi pi-angle-left" :disabled="!hasPreviousPhoto" @click="showPreviousPhoto" />
              <Button label="Next" severity="secondary" outlined icon="pi pi-angle-right" iconPos="right" :disabled="!hasNextPhoto" @click="showNextPhoto" />
              <a :href="activePhoto.driveLink" target="_blank" rel="noreferrer">
                <Button label="Open in Drive" severity="secondary" outlined icon="pi pi-external-link" />
              </a>
              <a v-if="activePhoto.driveFileId" :href="driveDownloadUrl(activePhoto)" target="_blank" rel="noreferrer" download>
                <Button label="Download Image" icon="pi pi-download" />
              </a>
              <Button
                label="Run Index"
                severity="secondary"
                outlined
                icon="pi pi-sparkles"
                :loading="saving.indexPhotoId === activePhoto.id"
                @click="runPhotoIndex(activePhoto)"
              />
            </div>
          </div>
        </div>
      </div>
    </Dialog>
  </main>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import Button from "primevue/button";
import Card from "primevue/card";
import Checkbox from "primevue/checkbox";
import Dialog from "primevue/dialog";
import InputText from "primevue/inputtext";
import Message from "primevue/message";
import MultiSelect from "primevue/multiselect";
import Select from "primevue/select";
import Tag from "primevue/tag";
import {
  createGallery,
  createGuest,
  createPhoto,
  deleteGallery,
  getAdminSnapshot,
  getDriveAuthUrl,
  indexPhoto,
  refreshGalleryPin,
  syncGalleryDrive,
  uploadGalleryHeaderImage,
} from "../lib/api.js";
import { getSession, getSupabaseBrowserClient, signInWithGoogle, signOut } from "../lib/auth.js";

const workspaceSections = [
  { id: "gallery-setup", label: "Gallery Setup", caption: "Create or update gallery details" },
  { id: "guest-library", label: "People", caption: "Manage people and reference scans" },
  { id: "photo-sources", label: "Photo Sources", caption: "Add manual files or sync Drive" },
  { id: "gallery-view", label: "Gallery View", caption: "Open, preview, and download images" },
];

const route = useRoute();
const router = useRouter();
const galleries = ref([]);
const guests = ref([]);
const photos = ref([]);
const feedback = ref("");
const error = ref("");
const session = ref(null);
const authReady = ref(false);
const authBusy = ref(false);
const activeGalleryId = ref("");
const activePhoto = ref(null);
const saving = reactive({
  gallery: false,
  guest: false,
  photo: false,
  headerImageGalleryId: "",
  deleteGalleryId: "",
  refreshPinGalleryId: "",
  connectDriveId: "",
  syncGalleryId: "",
  indexPhotoId: "",
});

const galleryForm = reactive({
  title: "",
  slug: "",
  driveLink: "",
  isPublic: true,
});

const guestForm = reactive({
  name: "",
  galleryId: "",
  image: null,
});

const photoForm = reactive({
  galleryId: "",
  title: "",
  driveLink: "",
  capturedAt: "",
  guestIds: [],
});

const selectedGallery = computed(() => galleries.value.find((gallery) => gallery.id === activeGalleryId.value) || galleries.value[0] || null);
const selectedGalleryGuests = computed(() =>
  selectedGallery.value ? guests.value.filter((guest) => guest.galleryId === selectedGallery.value.id) : [],
);
const selectedGalleryPhotos = computed(() =>
  selectedGallery.value
    ? photos.value
        .filter((photo) => photo.galleryId === selectedGallery.value.id)
        .slice()
        .sort((left, right) => {
          const leftDate = left.capturedAt || left.createdAt || "";
          const rightDate = right.capturedAt || right.createdAt || "";
          return rightDate.localeCompare(leftDate);
        })
    : [],
);
const currentPhotoIndex = computed(() => selectedGalleryPhotos.value.findIndex((photo) => photo.id === activePhoto.value?.id));
const hasPreviousPhoto = computed(() => currentPhotoIndex.value > 0);
const hasNextPhoto = computed(() => currentPhotoIndex.value >= 0 && currentPhotoIndex.value < selectedGalleryPhotos.value.length - 1);
const currentPhotoPositionLabel = computed(() =>
  currentPhotoIndex.value >= 0 ? `Image ${currentPhotoIndex.value + 1} of ${selectedGalleryPhotos.value.length}` : "",
);
const photoGuests = computed(() => guests.value.filter((guest) => guest.galleryId === photoForm.galleryId));

let authSubscription;

watch(
  () => galleryForm.title,
  (value) => {
    if (!galleryForm.slug || galleryForm.slug === slugify(galleryForm.slug)) {
      galleryForm.slug = slugify(value);
    }
  },
);

watch(
  () => galleries.value.map((gallery) => gallery.id),
  (galleryIds) => {
    if (!galleryIds.length) {
      activeGalleryId.value = "";
      return;
    }

    if (!galleryIds.includes(activeGalleryId.value)) {
      activeGalleryId.value = galleryIds[0];
    }
  },
  { immediate: true },
);

watch(selectedGallery, (gallery) => {
  if (!gallery) {
    guestForm.galleryId = "";
    photoForm.galleryId = "";
    return;
  }

  if (!guestForm.galleryId || !galleries.value.some((item) => item.id === guestForm.galleryId)) {
    guestForm.galleryId = gallery.id;
  }

  if (!photoForm.galleryId || !galleries.value.some((item) => item.id === photoForm.galleryId)) {
    photoForm.galleryId = gallery.id;
  }
});

watch(
  () => photoForm.galleryId,
  () => {
    photoForm.guestIds = photoForm.guestIds.filter((guestId) => photoGuests.value.some((guest) => guest.id === guestId));
  },
);

watch(
  () => photos.value,
  (nextPhotos) => {
    if (!activePhoto.value) {
      return;
    }

    activePhoto.value = nextPhotos.find((photo) => photo.id === activePhoto.value.id) || null;
  },
);

onMounted(initializeAuth);
onMounted(() => window.addEventListener("keydown", handleKeydown));

onBeforeUnmount(() => {
  authSubscription?.unsubscribe();
  window.removeEventListener("keydown", handleKeydown);
});

async function initializeAuth() {
  try {
    const client = getSupabaseBrowserClient();
    const listener = client.auth.onAuthStateChange((_event, nextSession) => {
      void handleSessionChange(nextSession);
    });
    authSubscription = listener.data.subscription;
    session.value = await getSession();

    if (session.value) {
      await loadSnapshot();
    } else {
      clearSnapshot();
    }
  } catch (loadError) {
    error.value = loadError.message;
  } finally {
    authReady.value = true;
    await handleDriveRedirectMessage();
  }
}

async function handleSessionChange(nextSession) {
  session.value = nextSession;
  error.value = "";

  if (!nextSession) {
    clearSnapshot();
    return;
  }

  await loadSnapshot();
}

function clearSnapshot() {
  galleries.value = [];
  guests.value = [];
  photos.value = [];
  activePhoto.value = null;
}

async function loadSnapshot() {
  try {
    error.value = "";
    const snapshot = await getAdminSnapshot();
    galleries.value = snapshot.galleries;
    guests.value = snapshot.guests;
    photos.value = snapshot.photos;
  } catch (loadError) {
    error.value = loadError.message;
  }
}

async function handleDriveRedirectMessage() {
  const status = route.query.drive;
  const message = route.query.message;

  if (!status) {
    return;
  }

  if (status === "connected") {
    feedback.value = message ? `Drive connected: ${message}` : "Drive connected.";

    if (session.value) {
      await loadSnapshot();
    }
  } else if (status === "error") {
    error.value = typeof message === "string" ? message : "Unable to connect Google Drive.";
  }

  await router.replace({
    path: route.path,
    query: {
      ...Object.fromEntries(Object.entries(route.query).filter(([key]) => !["drive", "message", "galleryId"].includes(key))),
    },
  });
}

async function login() {
  try {
    authBusy.value = true;
    error.value = "";
    feedback.value = "";
    await signInWithGoogle();
  } catch (loginError) {
    error.value = loginError.message;
  } finally {
    authBusy.value = false;
  }
}

async function logout() {
  try {
    authBusy.value = true;
    error.value = "";
    await signOut();
    feedback.value = "Signed out.";
    clearSnapshot();
  } catch (logoutError) {
    error.value = logoutError.message;
  } finally {
    authBusy.value = false;
  }
}

async function submitGallery() {
  try {
    saving.gallery = true;
    error.value = "";
    const result = await createGallery({
      title: galleryForm.title,
      slug: slugify(galleryForm.slug),
      driveLink: galleryForm.driveLink,
      isPublic: galleryForm.isPublic,
    });
    feedback.value = "Gallery saved.";
    Object.assign(galleryForm, {
      title: "",
      slug: "",
      driveLink: "",
      isPublic: true,
    });
    await loadSnapshot();
    setActiveGallery(result.gallery.id);
  } catch (submitError) {
    error.value = submitError.message;
  } finally {
    saving.gallery = false;
  }
}

function populateGalleryForm(gallery) {
  if (!gallery) {
    return;
  }

  Object.assign(galleryForm, {
    title: gallery.title,
    slug: gallery.slug,
    driveLink: gallery.driveLink,
    isPublic: gallery.isPublic,
  });
}

function handleGuestFile(event) {
  guestForm.image = event.target.files?.[0] || null;
}

async function submitGuest() {
  if (!guestForm.image) {
    error.value = "Choose a reference selfie for the guest.";
    return;
  }

  try {
    saving.guest = true;
    error.value = "";
    const formData = new FormData();
    formData.set("name", guestForm.name);
    formData.set("galleryId", guestForm.galleryId);
    formData.set("image", guestForm.image);
    await createGuest(formData);
    feedback.value = "Guest added.";
    setActiveGallery(guestForm.galleryId);
    Object.assign(guestForm, {
      name: "",
      galleryId: guestForm.galleryId,
      image: null,
    });
    await loadSnapshot();
  } catch (submitError) {
    error.value = submitError.message;
  } finally {
    saving.guest = false;
  }
}

async function submitPhoto() {
  try {
    saving.photo = true;
    error.value = "";
    const result = await createPhoto({
      galleryId: photoForm.galleryId,
      title: photoForm.title,
      driveLink: photoForm.driveLink,
      capturedAt: photoForm.capturedAt,
      guestIds: photoForm.guestIds,
    });
    feedback.value = buildIndexingFeedback(result.indexing, "Photo mapped.");
    setActiveGallery(photoForm.galleryId);
    Object.assign(photoForm, {
      galleryId: photoForm.galleryId,
      title: "",
      driveLink: "",
      capturedAt: "",
      guestIds: [],
    });
    await loadSnapshot();
  } catch (submitError) {
    error.value = submitError.message;
  } finally {
    saving.photo = false;
  }
}

async function runPhotoIndex(photo) {
  try {
    saving.indexPhotoId = photo.id;
    error.value = "";
    const result = await indexPhoto(photo.id);
    feedback.value = buildIndexingFeedback(result.indexing, `Re-indexed ${photo.title}.`);
    await loadSnapshot();
  } catch (indexError) {
    error.value = indexError.message;
  } finally {
    saving.indexPhotoId = "";
  }
}

async function syncDriveGallery(gallery) {
  try {
    saving.syncGalleryId = gallery.id;
    error.value = "";
    const result = await syncGalleryDrive(gallery.id);
    const feedbackParts = [`Synced ${result.syncedCount} image${result.syncedCount === 1 ? "" : "s"} from Google Drive.`];

    if (result.skippedCount) {
      const skippedPreview = (result.skippedFiles || [])
        .slice(0, 3)
        .map((file) => `${file.name}: ${file.reason}`)
        .join(" | ");

      feedbackParts.push(
        `Skipped ${result.skippedCount} image${result.skippedCount === 1 ? "" : "s"}${skippedPreview ? ` (${skippedPreview})` : ""}.`,
      );
    }

    feedback.value = feedbackParts.join(" ");
    await loadSnapshot();
  } catch (syncError) {
    error.value = syncError.message;
  } finally {
    saving.syncGalleryId = "";
  }
}

async function connectDrive(gallery) {
  try {
    saving.connectDriveId = gallery.id;
    error.value = "";
    feedback.value = "";
    const result = await getDriveAuthUrl(gallery.id);
    window.location.assign(result.url);
  } catch (connectError) {
    error.value = connectError.message;
  } finally {
    saving.connectDriveId = "";
  }
}

async function removeGallery(gallery) {
  const shouldDelete = window.confirm(`Delete "${gallery.title}"? This will remove its photos, guest references, face data, and synced assets.`);

  if (!shouldDelete) {
    return;
  }

  try {
    saving.deleteGalleryId = gallery.id;
    error.value = "";
    feedback.value = "";
    const result = await deleteGallery(gallery.id);

    if (activePhoto.value?.galleryId === gallery.id) {
      activePhoto.value = null;
    }

    await loadSnapshot();
    feedback.value = `Deleted ${result.gallery.title}.`;
  } catch (deleteError) {
    error.value = deleteError.message;
  } finally {
    saving.deleteGalleryId = "";
  }
}

async function uploadHeaderImage(event, gallery) {
  const file = event.target.files?.[0];
  event.target.value = "";

  if (!file) {
    return;
  }

  try {
    saving.headerImageGalleryId = gallery.id;
    error.value = "";
    const formData = new FormData();
    formData.set("image", file);
    await uploadGalleryHeaderImage(gallery.id, formData);
    await loadSnapshot();
    feedback.value = `Updated the header image for ${gallery.title}.`;
  } catch (uploadError) {
    error.value = uploadError.message;
  } finally {
    saving.headerImageGalleryId = "";
  }
}

async function refreshPin(gallery) {
  try {
    saving.refreshPinGalleryId = gallery.id;
    error.value = "";
    const result = await refreshGalleryPin(gallery.id);
    await loadSnapshot();
    feedback.value = `Common PIN refreshed for ${result.gallery.title}.`;
  } catch (refreshError) {
    error.value = refreshError.message;
  } finally {
    saving.refreshPinGalleryId = "";
  }
}

function setActiveGallery(galleryId) {
  activeGalleryId.value = galleryId;
  guestForm.galleryId = galleryId;
  photoForm.galleryId = galleryId;
}

function galleryGuestCount(galleryId) {
  return guests.value.filter((guest) => guest.galleryId === galleryId).length;
}

function galleryPhotoCount(galleryId) {
  return photos.value.filter((photo) => photo.galleryId === galleryId).length;
}

function galleryIndexedPhotoCount(galleryId) {
  return photos.value.filter((photo) => photo.galleryId === galleryId && photo.faceCount > 0).length;
}

function photoGuestNames(photo) {
  return photo.guestIds
    .map((guestId) => guests.value.find((guest) => guest.id === guestId)?.name)
    .filter(Boolean)
    .join(", ");
}

function openPhoto(photo) {
  activePhoto.value = photo;
}

function closePhoto() {
  activePhoto.value = null;
}

function showPreviousPhoto() {
  if (!hasPreviousPhoto.value) {
    return;
  }

  activePhoto.value = selectedGalleryPhotos.value[currentPhotoIndex.value - 1] || activePhoto.value;
}

function showNextPhoto() {
  if (!hasNextPhoto.value) {
    return;
  }

  activePhoto.value = selectedGalleryPhotos.value[currentPhotoIndex.value + 1] || activePhoto.value;
}

function handleKeydown(event) {
  if (!activePhoto.value) {
    return;
  }

  if (event.key === "Escape") {
    closePhoto();
  } else if (event.key === "ArrowLeft") {
    showPreviousPhoto();
  } else if (event.key === "ArrowRight") {
    showNextPhoto();
  }
}

function scrollToSection(sectionId) {
  document.getElementById(sectionId)?.scrollIntoView({ behavior: "smooth", block: "start" });
}

function personalUrl(slug) {
  return `${window.location.origin}/g/${slug}`;
}

function commonUrl(slug) {
  return `${window.location.origin}/g/${slug}/all`;
}

function driveDownloadUrl(photo) {
  return `https://drive.google.com/uc?export=download&id=${encodeURIComponent(photo.driveFileId)}`;
}

function formatDate(value) {
  if (!value) {
    return "Date not set";
  }

  return new Intl.DateTimeFormat(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(new Date(value));
}

function slugify(value) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function buildIndexingFeedback(indexing, fallbackMessage) {
  if (!indexing) {
    return fallbackMessage;
  }

  if (!indexing.attempted) {
    return `${fallbackMessage} Index not attempted: ${indexing.reason}`;
  }

  if (!indexing.indexed) {
    return `${fallbackMessage} Index failed: ${indexing.reason}`;
  }

  return `${fallbackMessage} Indexed ${indexing.faceCount || 0} face${indexing.faceCount === 1 ? "" : "s"} from ${indexing.syncSource === "thumbnail_fallback" ? "Drive thumbnail fallback" : "original image"}.`;
}
</script>
