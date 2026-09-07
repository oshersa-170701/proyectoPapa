# Graph Report - proyecto-papa  (2026-09-06)

## Corpus Check
- 160 files · ~55,635 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 790 nodes · 1086 edges · 84 communities (35 shown, 17 thin omitted)
- Extraction: 96% EXTRACTED · 4% INFERRED · 1% AMBIGUOUS · INFERRED: 40 edges (avg confidence: 0.8)
- Token cost: 92,563 input · 0 output

## Community Hubs (Navigation)
- Angular Core Dependencies
- Medical Service Layer
- Root Package Manifest
- Angular Build Targets
- AnaConnect Plugin Manifest
- App Dependency List
- AnaHealth Plugin Manifest
- Angular Dev Tooling
- Home Chat & Voice Assistant
- Angular Workspace Config
- AnaConnect Android Plugin
- AnaHealth iOS Plugin
- Doctor List & Appointments
- TypeScript Compiler Config
- TypeScript Compiler Config (Plugin)
- AnaConnect Plugin API Definitions
- Plugin Dev Tooling
- Plugin Build Scripts
- AnaConnect Speaker Modal
- Hospital List & Distance
- App Root & Routing
- Medical Map (Leaflet)
- Medications Modal
- AnaHealth Plugin API Definitions
- Vitals Modal
- User Appointments
- Android Cast Options Provider
- Register Temperature Modal
- User Profile
- Android JUnit Boilerplate Test
- Root NPM Scripts
- Login Modal
- AnaHealth Android Plugin
- AnaHealth Plugin Contributing Guide
- Android Main Activity
- Medication Reminder Scheduler
- Platform Source Folders
- Gradle Wrapper Script
- Gradle Wrapper Script (Plugin)
- ESLint Config
- Package Repository Metadata
- Capacitor App Config
- Angular Zone Polyfills
- Package Bugs Metadata
- ESLint Extends Config
- Capacitor Peer Dependency
- Swift Package Manifest
- AnaConnect Modal Trigger
- Dev Environment Config
- Prod Environment Config
- Lint & Format Script
- Temperature Component Reference

## God Nodes (most connected - your core abstractions)
1. `HomePage` - 34 edges
2. `MedicalService` - 33 edges
3. `@angular/core` - 24 edges
4. `User` - 22 edges
5. `DoctorListComponent` - 17 edges
6. `compilerOptions` - 16 edges
7. `compilerOptions` - 16 edges
8. `scripts` - 15 edges
9. `ionicons` - 15 edges
10. `AnaconnectModalComponent` - 14 edges

## Surprising Connections (you probably didn't know these)
- `SignosVitales interface` --semantically_similar_to--> `VitalsModalComponent`  [INFERRED] [semantically similar]
  anaasis-health-plugin/README.md → src/app/shared/components/vitals-modal/vitals-modal.component.html
- `Project README (proyectoPapa)` --conceptually_related_to--> `AppComponent (ion-app root)`  [AMBIGUOUS]
  README.md → src/app/app.component.html
- `HomePage (chat UI)` --references--> `LoginModalComponent`  [AMBIGUOUS]
  src/app/home/home.page.html → src/app/shared/components/login-modal/login-modal.component.html
- `HomePage (chat UI)` --references--> `MisMedicamentosModalComponent`  [AMBIGUOUS]
  src/app/home/home.page.html → src/app/shared/components/mis-medicamentos-modal/mis-medicamentos-modal.component.html
- `HomePage (chat UI)` --references--> `RegisterModalComponent`  [AMBIGUOUS]
  src/app/home/home.page.html → src/app/shared/components/register-modal/register-modal.component.html

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Home Page Voice-Command Menu to Feature Modals** — src_app_home_home_page_home_page, src_app_shared_components_mis_medicamentos_modal_mis_medicamentos_modal_component_mis_medicamentos_modal, src_app_shared_components_user_appointments_user_appointments_component_user_appointments, src_app_shared_components_user_profile_user_profile_component_user_profile, src_app_shared_components_vitals_modal_vitals_modal_component_vitals_modal, src_app_shared_components_hospital_list_hospital_list_component_hospital_list, src_app_shared_components_doctor_list_doctor_list_component_doctor_list [INFERRED 0.75]
- **Emergency SOS / Ambulance Tracking Flow** — src_app_home_home_page_solicitarambulancia, src_app_home_home_page_cancelaremergencia, src_app_shared_components_medical_map_medical_map_component_medical_map [INFERRED 0.75]
- **Login/Register/Profile Authentication Flow** — src_app_shared_components_login_modal_login_modal_component_login_modal, src_app_shared_components_register_modal_register_modal_component_register_modal, src_app_shared_components_user_profile_user_profile_component_user_profile [INFERRED 0.75]

## Communities (84 total, 17 thin omitted)

### Community 0 - "Angular Core Dependencies"
Cohesion: 0.06
Nodes (29): Pipe, @angular/common, @angular/core, @angular/forms, @capacitor-community/text-to-speech, @capacitor/local-notifications, @ionic/angular, ionicons (+21 more)

### Community 1 - "Medical Service Layer"
Cohesion: 0.05
Nodes (8): Health, Injectable, MedicalService, Injectable, Overpass, Injectable, HomePage, Component

### Community 2 - "Root Package Manifest"
Cohesion: 0.04
Nodes (49): author, description, homepage, @capacitor/android, @capacitor/core, eslint, typescript, name (+41 more)

### Community 3 - "Angular Build Targets"
Cohesion: 0.05
Nodes (49): architect, build, extract-i18n, lint, serve, test, builder, configurations (+41 more)

### Community 4 - "AnaConnect Plugin Manifest"
Cohesion: 0.06
Nodes (32): src, author, capacitor, android, description, devDependencies, @capacitor/android, @capacitor/core (+24 more)

### Community 5 - "App Dependency List"
Cohesion: 0.06
Nodes (31): dependencies, anaasis-connect-plugin, anaasis-health-plugin, @angular/animations, @angular/common, @angular/compiler, @angular/core, @angular/forms (+23 more)

### Community 6 - "AnaHealth Plugin Manifest"
Cohesion: 0.07
Nodes (28): author, description, files, @capacitor/android, @capacitor/core, eslint, rimraf, rollup (+20 more)

### Community 7 - "Angular Dev Tooling"
Cohesion: 0.07
Nodes (28): devDependencies, @angular/cli, @angular/compiler-cli, @angular-devkit/build-angular, @angular-eslint/builder, @angular-eslint/eslint-plugin, @angular-eslint/eslint-plugin-template, @angular-eslint/schematics (+20 more)

### Community 8 - "Home Chat & Voice Assistant"
Cohesion: 0.08
Nodes (17): SignosVitales interface, Project README (proyectoPapa), AppComponent (ion-app root), HomePage (chat UI), BotMessageComponent, ChatOptionsComponent, DoctorListComponent, HospitalListComponent (+9 more)

### Community 9 - "Angular Workspace Config"
Cohesion: 0.09
Nodes (23): setParserOptionsProject, setParserOptionsProject, prefix, projectType, root, schematics, sourceRoot, cli (+15 more)

### Community 10 - "AnaConnect Android Plugin"
Cohesion: 0.20
Nodes (7): ANAasisConnectPlugin, SessionManagerListener, Plugin, PluginCall, CastSession, MediaRouter, MediaRouteSelector

### Community 11 - "AnaHealth iOS Plugin"
Cohesion: 0.11
Nodes (14): ANAasisHealth, ANAasisHealthPlugin, ANAasisHealthTests, ANAasisHealthPlugin, Capacitor, CAPBridgedPlugin, CAPPlugin, CAPPluginCall (+6 more)

### Community 12 - "Doctor List & Appointments"
Cohesion: 0.17
Nodes (3): DoctorListComponent, Component, Input

### Community 13 - "TypeScript Compiler Config"
Cohesion: 0.11
Nodes (17): compilerOptions, allowUnreachableCode, declaration, esModuleInterop, inlineSources, lib, module, moduleResolution (+9 more)

### Community 14 - "TypeScript Compiler Config (Plugin)"
Cohesion: 0.11
Nodes (17): compilerOptions, allowUnreachableCode, declaration, esModuleInterop, inlineSources, lib, module, moduleResolution (+9 more)

### Community 15 - "AnaConnect Plugin API Definitions"
Cohesion: 0.19
Nodes (8): ANAasisConnectPlugin, CastDeviceInfo, DiscoverDevicesResult, SpeakOptions, ANAasisConnect, ANAasisConnectWeb, Anaconnect, Injectable

### Community 16 - "Plugin Dev Tooling"
Cohesion: 0.13
Nodes (15): devDependencies, @capacitor/android, @capacitor/core, @capacitor/docgen, @capacitor/ios, eslint, @ionic/eslint-config, @ionic/prettier-config (+7 more)

### Community 17 - "Plugin Build Scripts"
Cohesion: 0.13
Nodes (15): scripts, build, clean, docgen, eslint, fmt, lint, prepublishOnly (+7 more)

### Community 18 - "AnaConnect Speaker Modal"
Cohesion: 0.22
Nodes (3): CastDevice, AnaconnectModalComponent, Component

### Community 19 - "Hospital List & Distance"
Cohesion: 0.22
Nodes (3): HospitalListComponent, Component, Input

### Community 20 - "App Root & Routing"
Cohesion: 0.24
Nodes (6): @angular/platform-browser, @angular/router, @capacitor/splash-screen, AppComponent, Component, routes

### Community 21 - "Medical Map (Leaflet)"
Cohesion: 0.25
Nodes (4): leaflet, MedicalMapComponent, Component, Input

### Community 23 - "AnaHealth Plugin API Definitions"
Cohesion: 0.31
Nodes (4): ANAasisHealthPlugin, SignosVitales, ANAasisHealth, ANAasisHealthWeb

### Community 24 - "Vitals Modal"
Cohesion: 0.29
Nodes (3): Component, Input, VitalsModalComponent

### Community 26 - "Android Cast Options Provider"
Cohesion: 0.43
Nodes (5): CastOptionsProvider, CastOptions, Context, OptionsProvider, SessionProvider

### Community 29 - "Android JUnit Boilerplate Test"
Cohesion: 0.38
Nodes (3): ExampleUnitTest, ExampleUnitTest, org.junit.Test

### Community 30 - "Root NPM Scripts"
Cohesion: 0.29
Nodes (7): scripts, build, lint, ng, start, test, watch

### Community 32 - "AnaHealth Android Plugin"
Cohesion: 0.53
Nodes (3): ANAasisHealthPlugin, Plugin, PluginCall

### Community 33 - "AnaHealth Plugin Contributing Guide"
Cohesion: 0.33
Nodes (5): Anaasis Health Plugin Contributing Guide, npm run build (plugin build + docgen), npm run verify (CI build + validate), prepublishOnly hook, obtenerMediciones()

### Community 34 - "Android Main Activity"
Cohesion: 0.47
Nodes (4): MainActivity, android.os.Bundle, com.getcapacitor.BridgeActivity, Override

### Community 36 - "Platform Source Folders"
Cohesion: 0.40
Nodes (5): src, capacitor, android, ios, src

### Community 37 - "Gradle Wrapper Script"
Cohesion: 0.83
Nodes (3): gradlew script, die(), warn()

### Community 38 - "Gradle Wrapper Script (Plugin)"
Cohesion: 0.83
Nodes (3): gradlew script, die(), warn()

### Community 39 - "ESLint Config"
Cohesion: 0.50
Nodes (3): ignorePatterns, overrides, root

### Community 40 - "Package Repository Metadata"
Cohesion: 0.67
Nodes (3): repository, type, url

## Ambiguous Edges - Review These
- `Project README (proyectoPapa)` → `AppComponent (ion-app root)`  [AMBIGUOUS]
  README.md · relation: conceptually_related_to
- `AppComponent (ion-app root)` → `HomePage (chat UI)`  [AMBIGUOUS]
  src/app/app.component.html · relation: references
- `HomePage (chat UI)` → `LoginModalComponent`  [AMBIGUOUS]
  src/app/home/home.page.html · relation: references
- `HomePage (chat UI)` → `MisMedicamentosModalComponent`  [AMBIGUOUS]
  src/app/home/home.page.html · relation: references
- `HomePage (chat UI)` → `RegisterModalComponent`  [AMBIGUOUS]
  src/app/home/home.page.html · relation: references
- `HomePage (chat UI)` → `UserAppointmentsComponent`  [AMBIGUOUS]
  src/app/home/home.page.html · relation: references
- `HomePage (chat UI)` → `UserProfileComponent`  [AMBIGUOUS]
  src/app/home/home.page.html · relation: references
- `HomePage (chat UI)` → `VitalsModalComponent`  [AMBIGUOUS]
  src/app/home/home.page.html · relation: references

## Knowledge Gaps
- **294 isolated node(s):** `root`, `ignorePatterns`, `overrides`, `name`, `version` (+289 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 437 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **17 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **What is the exact relationship between `Project README (proyectoPapa)` and `AppComponent (ion-app root)`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._
- **What is the exact relationship between `AppComponent (ion-app root)` and `HomePage (chat UI)`?**
  _Edge tagged AMBIGUOUS (relation: references) - confidence is low._
- **What is the exact relationship between `HomePage (chat UI)` and `LoginModalComponent`?**
  _Edge tagged AMBIGUOUS (relation: references) - confidence is low._
- **What is the exact relationship between `HomePage (chat UI)` and `MisMedicamentosModalComponent`?**
  _Edge tagged AMBIGUOUS (relation: references) - confidence is low._
- **What is the exact relationship between `HomePage (chat UI)` and `RegisterModalComponent`?**
  _Edge tagged AMBIGUOUS (relation: references) - confidence is low._
- **What is the exact relationship between `HomePage (chat UI)` and `UserAppointmentsComponent`?**
  _Edge tagged AMBIGUOUS (relation: references) - confidence is low._
- **What is the exact relationship between `HomePage (chat UI)` and `UserProfileComponent`?**
  _Edge tagged AMBIGUOUS (relation: references) - confidence is low._