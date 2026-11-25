const format = new Intl.NumberFormat('es-CO', {maximumSignificantDigits: 4});
const f = n => format.format(n);
export function calculationSteps(model, parts, probe, ms, excitation) {
  const source = parts.find(p => p.k === 'V');
  const pulse = excitation === 'pulse';
  const steps = [`Lee la sonda. En ${probe}, la primera curva es la tensión entre sus terminales (V) y la segunda es la corriente (mA). El eje horizontal es el tiempo desde la conexión, en milisegundos. La fuente aplica ${f(source.val)} V${pulse ? ` y vuelve a 0 V a los ${f(ms/2)} ms` : ''}.`];
  if (!model) return [...steps, 'No se ha identificado una malla serie RC, RL o RLC. No uses τ = RC ni τ = L/R para toda esta red.', 'En cada nodo, la corriente que entra debe igualar la que sale. El simulador usa ese balance y las relaciones de cada pieza para calcular la tensión de los nodos paso a paso. Selecciona distintas ramas en «Medir en» para comparar sus corrientes.'];
  const {R,L,C,tau} = model;
  steps.push(`Pasa los valores a unidades del SI. En esta malla: R = ${f(R)} Ω${L ? `, L = ${f(L*1000)} mH = ${f(L)} H` : ''}${C ? `, C = ${f(C*1e6)} µF = ${f(C)} F` : ''}. Si repites piezas en serie, suma resistencias e inductancias; para capacitores suma los inversos: 1/C = Σ(1/Cᵢ).`);
  if (tau) {
    const rc = model.type === 'RC';
    steps.push(rc ? 'Suma las caídas de tensión: Vₛ = Ri + V꜀. Como i = C dV꜀/dt, resulta RC dV꜀/dt = Vₛ − V꜀. Al integrar desde un capacitor descargado, V꜀(t) = Vₛ[1 − exp(−t/τ)].' : 'Suma las caídas de tensión: Vₛ = Ri + L di/dt. Al separar variables e integrar desde i(0) = 0, resulta i(t) = (Vₛ/R)[1 − exp(−t/τ)].');
    const t = Math.min(tau,ms/1000*(pulse ? .4 : .9)), change = -Math.expm1(-t/tau);
    const sensor = rc ? parts.find(p=>p.k==='C') : parts.find(p=>p.k==='L');
    const value = rc ? source.val*change*C/(sensor.val*1e-6) : 1000*source.val*change/R;
    steps.push(`Sustituye: τ = ${rc ? `${f(R)} × ${f(C)}` : `${f(L)} / ${f(R)}`} = ${f(tau*1000)} ms tras convertir segundos a milisegundos. En «Medir en», elige ${sensor.id}. Lleva la barra cerca de ${f(t*1000)} ms: la magnitud de ${rc?'su tensión':'la corriente'} debe rondar ${f(value)} ${rc?'V':'mA'}.${rc && parts.filter(p=>p.k==='C').length>1?' Para esta pieza se usa Vᵢ = (C/Cᵢ)V꜀ porque todos los capacitores en serie almacenan la misma carga.':''}`);
    if(pulse)steps.push('Después del pulso, toma como valor inicial el alcanzado al apagar la fuente. Desde ese instante, multiplica ese valor por exp(−Δt/τ): observarás la descarga o el decaimiento.');
  } else {
    const critical = 2*Math.sqrt(L/C);
    steps.push('Escribe Vₛ = Ri + L di/dt + q/C, donde q es la carga e i = dq/dt. Sustituye i: Lq″ + Rq′ + q/C = Vₛ. Para la respuesta libre prueba q ∝ exp(st); al dividir por L queda s² + (R/L)s + 1/(LC) = 0.');
    steps.push(`Compara las raíces. El discriminante se anula cuando R = 2√(L/C) = ${f(critical)} Ω. Con R = ${f(R)} Ω, el régimen es ${model.regime}. La frecuencia natural ideal es 1/(2π√(LC)) = ${f(model.f0)} Hz.`);
    steps.push(model.fd!==null ? `Comprueba la oscilación. Su frecuencia amortiguada es √[1/(LC) − (R/2L)²]/(2π) = ${f(model.fd)} Hz. Selecciona el capacitor y compara dos máximos sucesivos de tensión: su separación teórica es ${f(1000/model.fd)} ms. Si no se distinguen dos picos, prueba con un intervalo mayor o con menos resistencia.` : 'Selecciona el capacitor y examina la tensión: desde el reposo ante un escalón no debe superar su valor final. Cambia R por debajo del umbral y compara con la respuesta oscilatoria.');
  }
  return steps;
}
