# Graph Report - proyecto-papa  (2026-09-06)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 727 nodes · 1052 edges · 61 communities (33 shown, 15 thin omitted)
- Extraction: 97% EXTRACTED · 3% INFERRED · 0% AMBIGUOUS · INFERRED: 27 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `89afd602`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- home.page.ts
- HomePage
- options
- package.json
- anaasis-connect-plugin/package.json
- dependencies
- devDependencies
- anaasis-health-plugin/package.json
- app
- SessionManagerListener
- ANAasisHealthPlugin
- DoctorListComponent
- compilerOptions
- compilerOptions
- anaasis-connect-plugin/src/web.ts
- devDependencies
- scripts
- HospitalListComponent
- AppComponent
- AnaconnectModalComponent
- MedicalMapComponent
- MisMedicamentosModalComponent
- ANAasisHealthPlugin
- ReminderScheduler
- VitalsModalComponent
- UserAppointmentsComponent
- CastOptionsProvider.kt
- RegisterModalComponent
- RegistrarTemperaturaComponent
- UserProfileComponent
- org.junit.Test
- scripts
- LoginModalComponent
- ANAasisHealthPlugin
- MainActivity.java
- capacitor
- anaasis-health-plugin/android/gradlew
- android/gradlew
- .eslintrc.json
- repository
- capacitor.config.ts
- zone.js
- bugs
- eslintConfig
- peerDependencies
- Package.swift
- environment.ts
- environment.prod.ts

## God Nodes (most connected - your core abstractions)
1. `HomePage` - 34 edges
2. `MedicalService` - 33 edges
3. `@angular/core` - 24 edges
4. `User` - 22 edges
5. `DoctorListComponent` - 17 edges
6. `compilerOptions` - 16 edges
7. `compilerOptions` - 16 edges
8. `ionicons` - 15 edges
9. `scripts` - 15 edges
10. `HospitalListComponent` - 14 edges

## Surprising Connections (you probably didn't know these)
- `AnaconnectModalComponent` --references--> `CastDevice`  [EXTRACTED]
  src/app/shared/components/anaconnect-modal/anaconnect-modal.component.ts → src/app/core/services/anaconnect.ts
- `ANAasisHealthPlugin` --calls--> `ANAasisHealth`  [INFERRED]
  anaasis-health-plugin/ios/Sources/ANAasisHealthPlugin/ANAasisHealthPlugin.swift → anaasis-health-plugin/ios/Sources/ANAasisHealthPlugin/ANAasisHealth.swift
- `ANAasisConnectWeb` --implements--> `ANAasisConnectPlugin`  [EXTRACTED]
  anaasis-connect-plugin/src/web.ts → anaasis-connect-plugin/src/definitions.ts
- `ANAasisHealthWeb` --implements--> `ANAasisHealthPlugin`  [EXTRACTED]
  anaasis-health-plugin/src/web.ts → anaasis-health-plugin/src/definitions.ts

## Import Cycles
- None detected.

## Communities (61 total, 15 thin omitted)

### Community 0 - "home.page.ts"
Cohesion: 0.07
Nodes (27): Pipe, @angular/common, @angular/core, @angular/forms, @capacitor-community/text-to-speech, @ionic/angular, ionicons, rxjs (+19 more)

### Community 1 - "HomePage"
Cohesion: 0.06
Nodes (6): MedicalService, Injectable, Overpass, Injectable, HomePage, Component

### Community 2 - "options"
Cohesion: 0.05
Nodes (49): architect, build, extract-i18n, lint, serve, test, builder, configurations (+41 more)

### Community 3 - "package.json"
Cohesion: 0.04
Nodes (45): author, description, homepage, name, private, version, anaasis-connect-plugin, anaasis-health-plugin (+37 more)

### Community 4 - "anaasis-connect-plugin/package.json"
Cohesion: 0.06
Nodes (32): src, author, capacitor, android, description, devDependencies, @capacitor/android, @capacitor/core (+24 more)

### Community 5 - "dependencies"
Cohesion: 0.06
Nodes (31): dependencies, anaasis-connect-plugin, anaasis-health-plugin, @angular/animations, @angular/common, @angular/compiler, @angular/core, @angular/forms (+23 more)

### Community 6 - "devDependencies"
Cohesion: 0.07
Nodes (28): devDependencies, @angular/cli, @angular/compiler-cli, @angular-devkit/build-angular, @angular-eslint/builder, @angular-eslint/eslint-plugin, @angular-eslint/eslint-plugin-template, @angular-eslint/schematics (+20 more)

### Community 7 - "anaasis-health-plugin/package.json"
Cohesion: 0.08
Nodes (25): author, description, files, rimraf, rollup, keywords, license, main (+17 more)

### Community 8 - "app"
Cohesion: 0.09
Nodes (23): setParserOptionsProject, setParserOptionsProject, prefix, projectType, root, schematics, sourceRoot, cli (+15 more)

### Community 9 - "SessionManagerListener"
Cohesion: 0.19
Nodes (7): ANAasisConnectPlugin, SessionManagerListener, Plugin, PluginCall, CastSession, MediaRouter, MediaRouteSelector

### Community 10 - "ANAasisHealthPlugin"
Cohesion: 0.11
Nodes (14): ANAasisHealth, ANAasisHealthPlugin, ANAasisHealthTests, ANAasisHealthPlugin, Capacitor, CAPBridgedPlugin, CAPPlugin, CAPPluginCall (+6 more)

### Community 11 - "DoctorListComponent"
Cohesion: 0.17
Nodes (3): DoctorListComponent, Component, Input

### Community 12 - "compilerOptions"
Cohesion: 0.11
Nodes (17): compilerOptions, allowUnreachableCode, declaration, esModuleInterop, inlineSources, lib, module, moduleResolution (+9 more)

### Community 13 - "compilerOptions"
Cohesion: 0.11
Nodes (17): compilerOptions, allowUnreachableCode, declaration, esModuleInterop, inlineSources, lib, module, moduleResolution (+9 more)

### Community 14 - "anaasis-connect-plugin/src/web.ts"
Cohesion: 0.19
Nodes (8): ANAasisConnectPlugin, CastDeviceInfo, DiscoverDevicesResult, SpeakOptions, ANAasisConnect, ANAasisConnectWeb, Anaconnect, Injectable

### Community 15 - "devDependencies"
Cohesion: 0.13
Nodes (15): devDependencies, @capacitor/android, @capacitor/core, @capacitor/docgen, @capacitor/ios, eslint, @ionic/eslint-config, @ionic/prettier-config (+7 more)

### Community 16 - "scripts"
Cohesion: 0.13
Nodes (15): scripts, build, clean, docgen, eslint, fmt, lint, prepublishOnly (+7 more)

### Community 17 - "HospitalListComponent"
Cohesion: 0.22
Nodes (3): HospitalListComponent, Component, Input

### Community 18 - "AppComponent"
Cohesion: 0.24
Nodes (6): @angular/platform-browser, @angular/router, @capacitor/splash-screen, AppComponent, Component, routes

### Community 20 - "MedicalMapComponent"
Cohesion: 0.25
Nodes (4): leaflet, MedicalMapComponent, Component, Input

### Community 22 - "ANAasisHealthPlugin"
Cohesion: 0.31
Nodes (4): ANAasisHealthPlugin, SignosVitales, ANAasisHealth, ANAasisHealthWeb

### Community 23 - "ReminderScheduler"
Cohesion: 0.29
Nodes (5): @capacitor/local-notifications, MedicamentoParaRecordatorio, ReminderScheduler, TABLE_CODE, Injectable

### Community 24 - "VitalsModalComponent"
Cohesion: 0.29
Nodes (3): Component, Input, VitalsModalComponent

### Community 26 - "CastOptionsProvider.kt"
Cohesion: 0.43
Nodes (5): CastOptionsProvider, CastOptions, Context, OptionsProvider, SessionProvider

### Community 30 - "org.junit.Test"
Cohesion: 0.38
Nodes (3): ExampleUnitTest, ExampleUnitTest, org.junit.Test

### Community 31 - "scripts"
Cohesion: 0.29
Nodes (7): scripts, build, lint, ng, start, test, watch

### Community 33 - "ANAasisHealthPlugin"
Cohesion: 0.53
Nodes (3): ANAasisHealthPlugin, Plugin, PluginCall

### Community 34 - "MainActivity.java"
Cohesion: 0.47
Nodes (4): MainActivity, android.os.Bundle, com.getcapacitor.BridgeActivity, Override

### Community 35 - "capacitor"
Cohesion: 0.40
Nodes (5): src, capacitor, android, ios, src

### Community 36 - "anaasis-health-plugin/android/gradlew"
Cohesion: 0.83
Nodes (3): gradlew script, die(), warn()

### Community 37 - "android/gradlew"
Cohesion: 0.83
Nodes (3): gradlew script, die(), warn()

### Community 38 - ".eslintrc.json"
Cohesion: 0.50
Nodes (3): ignorePatterns, overrides, root

### Community 39 - "repository"
Cohesion: 0.67
Nodes (3): repository, type, url

## Knowledge Gaps
- **273 isolated node(s):** `BocinaEmparejada`, `MedicamentoUI`, `CastDeviceInfo`, `SignosVitales`, `MedicamentoParaRecordatorio` (+268 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 382 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **15 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `HomePage` connect `HomePage` to `home.page.ts`?**
  _High betweenness centrality (0.170) - this node is a cross-community bridge._
- **Why does `app` connect `app` to `HomePage`, `options`?**
  _High betweenness centrality (0.144) - this node is a cross-community bridge._
- **Why does `architect` connect `options` to `app`?**
  _High betweenness centrality (0.099) - this node is a cross-community bridge._
- **What connects `BocinaEmparejada`, `MedicamentoUI`, `CastDeviceInfo` to the rest of the system?**
  _273 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `home.page.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.07246376811594203 - nodes in this community are weakly interconnected._
- **Should `HomePage` be split into smaller, more focused modules?**
  _Cohesion score 0.05837173579109063 - nodes in this community are weakly interconnected._
- **Should `options` be split into smaller, more focused modules?**
  _Cohesion score 0.04931972789115646 - nodes in this community are weakly interconnected._