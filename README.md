# LabFisica · Laboratorio de Física II

**Pregunta de indagación:** ¿cómo influyen R, L y C en la respuesta temporal de un circuito? El laboratorio permite contrastar predicciones de la teoría con una simulación de componentes ideales. [Revisión frente al documento del proyecto](docs/revision-fisica.md).

## Ejecutar y verificar

Desde esta carpeta, ejecuta `python3 -m http.server 8000` y abre `http://localhost:8000`. En Vercel usa el preset **Other** y el directorio raíz `.`; no hay compilación, servicios externos ni dependencias que instalar. El esquema 2D funciona sin WebGL; la placa 3D requiere WebGL.

Con Node.js, ejecuta `node tests/editor.mjs` y `node tests/physics.mjs`. El primer archivo verifica redes, corrientes y geometría de terminales. El segundo contrasta la solución numérica con predicciones analíticas.

## Experimento reproducible

1. Carga **RC**: R = 100 Ω, C = 100 µF y fuente de 5 V. Elige C1 para medir la tensión del capacitor. Predicción: τ = RC = 10 ms; en t = τ, Vc ≈ 3,16 V.
2. Duplica R sin cambiar C. El voltaje final no cambia, pero ahora alcanzar esos 3,16 V tarda aproximadamente 20 ms. Con **Pulso**, la fuente vuelve a 0 V a mitad del intervalo y el capacitor se descarga por la resistencia.
3. Para **RLC**, fija L = 100 mH y C = 10 µF. Compara R = 20, 200 y 300 Ω. El límite crítico es 2√(L/C) = 200 Ω. Comprueba en las gráficas cuándo desaparece la oscilación.

## Organización del código

- `journey.js`, `atlas.js`: navegación y lámina didáctica interactiva.
- `editor.js`: montaje, controles, osciloscopio y reproducción.
- `solver.mjs`: balance nodal con modelos de R, L y C discretizados mediante Euler implícito; condiciones iniciales nulas. No es una solución analítica exacta.
- `series.mjs`: τ, frecuencia natural, frecuencia amortiguada y régimen para una única malla serie. No aplica estas fórmulas a redes ramificadas.
- `routes.mjs`, `wire-flow.mjs`, `free-view.js`: geometría compartida, trazadores de corriente convencional y representación tridimensional del mismo montaje.
- `vendor/` y `fonts/`: bibliotecas y tipografías locales con sus licencias. `editor.html` mantiene los enlaces antiguos al laboratorio unificado.
