<template>
  <main class="shell">
    <section class="gallery-hero" :style="heroStyle(gallery)">
      <div class="gallery-hero-top">
        <div class="gallery-hero-copy">
          <p class="gallery-kicker">{{ isPersonalResults ? "Personal Match" : "Common Link" }}</p>
          <h1>{{ gallery?.title || "Gallery" }}</h1>
          <p class="gallery-caption">
            {{
              isPersonalResults
                ? "These are the photos matched from your selfie scan. Switch back to the common gallery if you want the full event wall."
                : "A clean gallery wall for the full event archive. Open the personal link if you want the selfie-based matching flow instead."
            }}
          </p>
        </div>
        <div class="gallery-actions">
          <RouterLink class="button button-secondary" to="/">Overview</RouterLink>
          <RouterLink v-if="!isPersonalResults" class="button button-primary" :to="`/g/${slug}`">Personal Link</RouterLink>
          <RouterLink v-else class="button button-secondary" :to="`/g/${slug}`">Scan Again</RouterLink>
          <RouterLink v-if="isPersonalResults" class="button button-primary" :to="`/g/${slug}/all`">View All Photos</RouterLink>
        </div>
      </div>

      <div class="gallery-stat-grid">
        <article class="gallery-stat">
          <strong>{{ displayPhotos.length }}</strong>
          <span>{{ isPersonalResults ? "Matched Photos" : "Total Photos" }}</span>
        </article>
        <article class="gallery-stat">
          <strong>{{ photoYears }}</strong>
          <span>Captured Year{{ photoYears === 1 ? "" : "s" }}</span>
        </article>
        <article class="gallery-stat">
          <strong>{{ latestDate }}</strong>
          <span>Latest Capture</span>
        </article>
      </div>
    </section>

    <section class="gallery-strip">
      <div class="status-card">{{ status }}</div>
    </section>

    <section class="gallery-board">
      <aside class="gallery-callout">
        <p class="gallery-kicker">{{ isPersonalResults ? "Matched Set" : "Browse" }}</p>
        <h2>{{ isPersonalResults ? "Your Photo Collection" : "Event Collection" }}</h2>
        <p>
          {{
            isPersonalResults
              ? personalSummary
              : "Every card opens the original Drive item. The gallery surface uses the synced backend copy when available and falls back to the Drive thumbnail otherwise."
          }}
        </p>
        <div class="gallery-pill-row">
          <span class="gallery-pill">{{ isPersonalResults ? "Personal mode" : "Common mode" }}</span>
          <span class="gallery-pill">{{ displayPhotos.length }} image{{ displayPhotos.length === 1 ? "" : "s" }}</span>
        </div>
      </aside>

      <section class="panel">
        <div class="gallery-panel-title">
          <div>
            <p class="gallery-kicker">{{ isPersonalResults ? "Matches" : "Photo Wall" }}</p>
            <h2>{{ isPersonalResults ? "Matched Images" : "All Images" }}</h2>
          </div>
        </div>

        <div v-if="displayPhotos.length" class="gallery-grid">
          <article v-for="photo in displayPhotos" :key="photo.id" class="photo-card">
            <img :src="photo.storageImageUrl || photo.thumbnailUrl" :alt="photo.title" />
            <div>
              <h3>{{ photo.title }}</h3>
              <p>{{ formatDate(photo.capturedAt) }}</p>
              <p v-if="photo.matchScore != null">Match score: {{ photo.matchScore }} ({{ photo.matchConfidence }} confidence)</p>
              <p><a :href="photo.driveLink" target="_blank" rel="noreferrer">Open original in Drive</a></p>
            </div>
          </article>
        </div>
        <div v-else class="empty-state gallery-results-empty">{{ emptyMessage }}</div>
      </section>
    </section>
  </main>
</template>

<script setup>
import { computed, onMounted, ref } from "vue";
import { useRoute } from "vue-router";
import { getPublicGalleryPhotos } from "../lib/api.js";

const PERSONAL_MATCH_STORAGE_PREFIX = "picdrop-personal-match";

const props = defineProps({
  slug: {
    type: String,
    required: true,
  },
});

const route = useRoute();
const gallery = ref(null);
const photos = ref([]);
const status = ref("Loading gallery...");
const emptyMessage = ref("No gallery images are available yet.");
const personalResult = ref(null);

const isPersonalResults = computed(() => route.query.source === "personal" && Boolean(personalResult.value));
const displayPhotos = computed(() => (isPersonalResults.value ? personalResult.value?.match?.photos || [] : photos.value));
const personalSummary = computed(() => {
  if (!isPersonalResults.value) {
    return "";
  }

  if (!personalResult.value?.match) {
    return personalResult.value?.status || "No confident match was found for your selfie.";
  }

  const diagnostics = personalResult.value.diagnostics || {};
  const bestScore = diagnostics.bestScore ?? personalResult.value.match.bestScore ?? "n/a";
  return `${personalResult.value.match.photoCount} photos matched your selfie. Best score: ${bestScore}.`;
});

const photoYears = computed(() => {
  const years = new Set(
    displayPhotos.value
      .map((photo) => (photo.capturedAt ? new Date(photo.capturedAt).getFullYear() : null))
      .filter(Boolean),
  );
  return years.size || 0;
});

const latestDate = computed(() => {
  const datedPhotos = displayPhotos.value
    .filter((photo) => photo.capturedAt)
    .slice()
    .sort((left, right) => right.capturedAt.localeCompare(left.capturedAt));
  return datedPhotos[0] ? formatDate(datedPhotos[0].capturedAt) : "No date";
});

onMounted(loadGallery);

async function loadGallery() {
  try {
    restorePersonalMatch();

    const response = await getPublicGalleryPhotos(props.slug);
    gallery.value = response.gallery;
    photos.value = response.photos;

    if (isPersonalResults.value) {
      status.value = personalResult.value?.status || "Your matched photos are ready.";
      emptyMessage.value = personalResult.value?.status || "No confident match was found for your selfie.";
      return;
    }

    status.value = `${response.photos.length} image${response.photos.length === 1 ? "" : "s"} available in this gallery.`;

    if (!response.photos.length) {
      emptyMessage.value = "This gallery does not have any mapped photos yet.";
    }
  } catch (error) {
    status.value = error.message;
    emptyMessage.value = "This gallery is not available.";
  }
}

function restorePersonalMatch() {
  if (route.query.source !== "personal") {
    personalResult.value = null;
    return;
  }

  try {
    const stored = sessionStorage.getItem(matchStorageKey(props.slug));
    personalResult.value = stored ? JSON.parse(stored) : null;
  } catch {
    personalResult.value = null;
  }
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

function heroStyle(galleryRecord) {
  if (!galleryRecord?.headerImageUrl) {
    return {};
  }

  return {
    backgroundImage: `linear-gradient(135deg, rgba(255, 255, 255, 0.9), rgba(236, 247, 255, 0.82)), url("${galleryRecord.headerImageUrl}")`,
    backgroundPosition: "center",
    backgroundSize: "cover",
  };
}

function matchStorageKey(slug) {
  return `${PERSONAL_MATCH_STORAGE_PREFIX}:${slug}`;
}
</script>
