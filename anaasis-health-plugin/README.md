# anaasis-health-plugin

Anaasis plugin intento

## Install

To use npm

```bash
npm install anaasis-health-plugin
````

To use yarn

```bash
yarn add anaasis-health-plugin
```

Sync native files

```bash
npx cap sync
```

## API

<docgen-index>

* [`obtenerMediciones()`](#obtenermediciones)
* [Interfaces](#interfaces)

</docgen-index>

<docgen-api>
<!--Update the source file JSDoc comments and rerun docgen to update the docs below-->

### obtenerMediciones()

```typescript
obtenerMediciones() => Promise<SignosVitales>
```

Obtiene las mediciones de salud desde los sensores del dispositivo

**Returns:** <code>Promise&lt;<a href="#signosvitales">SignosVitales</a>&gt;</code>

--------------------


### Interfaces


#### SignosVitales

| Prop             | Type                |
| ---------------- | ------------------- |
| **`pulso`**      | <code>number</code> |
| **`oxigeno`**    | <code>number</code> |
| **`horasSueno`** | <code>number</code> |

</docgen-api>
