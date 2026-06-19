import { Routes } from "@angular/router";
import { NodeResolver } from "@app/shared/resolvers/node.resolver";
import { PreferenceResolver } from "@app/shared/resolvers/preference.resolver";
import { RTipsResolver } from "@app/shared/resolvers/r-tips-resolver.service";

export const recipientRoutes: Routes = [
  {
    path: "",
    loadComponent: () =>
      import("@app/pages/recipient/home/home.component").then(
        (m) => m.HomeComponent
      ),
    pathMatch: "full",
    data: { pageTitle: "Home" },
    resolve: {
      PreferenceResolver,
      RTipsResolver,
    },
  },
  {
    path: "home",
    loadComponent: () =>
      import("@app/pages/recipient/home/home.component").then(
        (m) => m.HomeComponent
      ),
    pathMatch: "full",
    resolve: {
      PreferenceResolver,
      RTipsResolver,
    },
    data: { pageTitle: "Home" },
  },
  {
    path: "reports",
    loadComponent: () =>
      import("@app/pages/recipient/tips/tips.component").then(
        (m) => m.TipsComponent
      ),
    pathMatch: "full",
    resolve: {
      PreferenceResolver,
      RTipsResolver,
    },
    data: { pageTitle: "Reports" },
  },
  {
    path: "conflict-of-interest",
    loadComponent: () =>
      import(
        "@app/pages/recipient/conflict-of-interest/conflict-of-interest.component"
      ).then((m) => m.ConflictOfInterestComponent),
    pathMatch: "full",
    resolve: {
      PreferenceResolver,
      RTipsResolver,
    },
    data: { pageTitle: "Conflict of Interest" },
  },

  {
    path: "settings",
    loadComponent: () =>
      import("@app/pages/recipient/settings/settings.component").then(
        (m) => m.RecipientSettingsComponent
      ),
    resolve: {
      NodeResolver,
    },
    pathMatch: "full",
    data: { pageTitle: "Settings" },
  },
  {
    path: "preferences",
    loadComponent: () =>
      import("@app/shared/partials/preferences/preferences.component").then(
        (m) => m.PreferencesComponent
      ),
    pathMatch: "full",
    resolve: {
      PreferenceResolver,
      RTipsResolver,
    },
    data: { pageTitle: "Preferences" },
  },
];
