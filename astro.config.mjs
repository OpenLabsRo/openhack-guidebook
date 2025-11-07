// astro.config.mjs
import { defineConfig } from "astro/config";
import starlight from "@astrojs/starlight";

export default defineConfig({
  integrations: [
    starlight({
      title: "OpenHack Guide",
      logo: {
        src: "./src/assets/logo.inline.js",
        alt: "OpenHack",
        replacesTitle: true,
      },
      favicon: "/logo.svg",
      customCss: ["./src/styles/zinc-theme.css"],
      components: {
        PageTitle: "./src/components/PageTitle.astro",
      },
      social: [
        {
          icon: "github",
          label: "GitHub",
          href: "https://github.com/OpenLabsRo",
        },
      ],
      sidebar: [
        // — General —
        {
          label: "General",
          items: [
            { label: "Summary", slug: "summary" }, // summary.md
            { label: "Packing List", slug: "packing-list" }, // packing-list.md
            { label: "Location & Venue", slug: "location-venue" }, // location-venue.md
            { label: "Check-In", slug: "check-in" }, // check-in.md
            { label: "Agenda", slug: "agenda" }, // agenda.md
            { label: "Transportation", slug: "transportation" }, // transportation.md
            { label: "Perks", slug: "perks" }, // perks.md
          ],
        },

        // — Hacking —
        {
          label: "Hacking",
          items: [
            { label: "Challenge Info", slug: "challenge-info" }, // challenge-info.md
            { label: "Resources", slug: "resources" }, // resources.md
            { label: "Judging Process", slug: "judging-process" }, // judging-process.md
            { label: "Submissions", slug: "submissions" }, // submissions.md
            { label: "Pitching", slug: "pitching" }, // pitching.md
          ],
        },

        // — Safety Rules —
        {
          label: "Safety Rules",
          items: [
            {
              label: "First Aid and Security",
              slug: "first-aid-security",
            }, // first-aid-security.md
            { label: "Code of Conduct", slug: "code-of-conduct" }, // code-of-conduct.md
            { label: "OpenHack rules", slug: "openhack-rules" }, // openhack-rules.md
          ],
        },

        // — Relax and Recharge —
        {
          label: "Relax and Recharge",
          items: [
            { label: "Food and drinks", slug: "food-and-drinks" }, // food-and-drinks.md
          ],
        },

        // — After the event —
        {
          label: "After the event",
          items: [
            { label: "Photos & Videos", slug: "photos-videos" }, // photos-videos.md
            { label: "Prizes", slug: "prizes" }, // photos-videos.md
          ],
        },
      ],
      // Optional niceties

      // search is on by default; dark mode too
    }),
  ],
});
