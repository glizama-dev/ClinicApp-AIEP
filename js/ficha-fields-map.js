(function () {
  'use strict';

  /**
   * Mapa de campo -> etiqueta, agrupado por sección, en el mismo orden y
   * con los mismos títulos que ficha-podologia.html / ficha-cosmetologia.html.
   * Se usa en historial.js para mostrar el detalle de una ficha respetando
   * la estructura del formulario original en vez de un listado plano.
   */

  function seccionSwme() {
    const fields = {};
    for (let i = 1; i <= 10; i++) {
      fields['swme' + i] = 'Punto ' + i + ' (sensibilidad)';
    }
    return fields;
  }

  function seccionTopografia() {
    const fields = {};
    for (let i = 1; i <= 5; i++) {
      fields['topoDD' + i] = 'Dedo ' + i + '° - D.D.';
      fields['topoDI' + i] = 'Dedo ' + i + '° - D.I.';
    }
    return fields;
  }

  const CONSENTIMIENTO = {
    consentFecha: 'Fecha',
    consentLugar: 'Lugar de la actividad',
    consentDocente: 'Docente a cargo de la actividad',
    consentEstudiante: 'Estudiante que realiza la atención',
    consentNombre: 'Nombre del paciente',
    consentRut: 'Rut del paciente',
    consentDecision: 'Decisión de participación',
  };

  const PODOLOGIA = [
    { title: 'Consentimiento informado', fields: CONSENTIMIENTO },
    {
      title: '1. Antecedentes personales',
      fields: {
        antFecha: 'Fecha',
        antNombre: 'Nombre',
        antRut: 'Rut',
        antTelefono: 'Teléfono',
        antEdad: 'Edad',
        antNacimiento: 'Fecha de nacimiento',
        antEstadoCivil: 'Estado civil',
        antPrevision: 'Previsión',
        antDireccion: 'Dirección',
        antOcupacion: 'Ocupación',
      },
    },
    {
      title: '2. Anamnesis próxima',
      fields: { anamnesisProxima: 'Motivo de consulta y antecedentes de la afección actual' },
    },
    {
      title: '3. Anamnesis remota',
      fields: {
        farmacologia: 'Farmacología',
        farmacologiaDetalle: 'Farmacología - Detalle',
        enfCronicas: 'Enfermedades crónicas',
        enfCronicasDetalle: 'Enfermedades crónicas - Detalle',
        enfRespiratorias: 'Enfermedades respiratorias',
        enfRespiratoriasDetalle: 'Enfermedades respiratorias - Detalle',
        diabetes: 'Diabetes',
        diabetesTipo: 'Diabetes - Tipo',
        enfNeurologicas: 'Enfermedades neurológicas',
        enfNeurologicasDetalle: 'Enfermedades neurológicas - Detalle',
        antFamiliares: 'Antecedentes familiares',
        antFamiliaresDetalle: 'Antecedentes familiares - Detalle',
        habitoTabaco: 'Hábito - Tabaco',
        habitoDrogas: 'Hábito - Drogas',
        habitoAlcohol: 'Hábito - Alcohol',
        habitoOtros: 'Hábito - Otros',
        alterOrtopedicas: 'Alteraciones ortopédicas',
        alterOrtopedicasDetalle: 'Alteraciones ortopédicas - Detalle',
        alterCirculatorias: 'Alteraciones circulatorias',
        alterCirculatoriasDetalle: 'Alteraciones circulatorias - Detalle',
        ulcerasHeridas: 'Úlceras / heridas',
        ulcerasHeridasDetalle: 'Úlceras / heridas - Detalle',
        alergia: 'Alergia',
        alergiaDetalle: 'Alergia - Detalle',
      },
    },
    {
      title: '4. Signos vitales y antropometría',
      fields: {
        vitalPA: 'P/A (presión arterial)',
        vitalTemp: 'T° (temperatura)',
        vitalFC: 'FC (frecuencia cardíaca)',
        vitalHGT: 'HGT (hemoglucotest)',
        vitalFR: 'FR (frecuencia respiratoria)',
        vitalSatO2: 'SatO2% (saturación)',
        vitalPeso: 'Peso (kg)',
        vitalTalla: 'Talla (cm)',
        vitalIMC: 'Índice de masa corporal (IMC)',
      },
    },
    {
      title: '5. Evaluación física EEII',
      fields: {
        tempExtremidadDer: 'Temperatura extremidad - Pie derecho',
        tempExtremidadIzq: 'Temperatura extremidad - Pie izquierdo',
        obsTempExtremidad: 'Temperatura extremidad - Observaciones',
        pulsoPedioDer: 'Pulso pedio - Pie derecho',
        pulsoPedioIzq: 'Pulso pedio - Pie izquierdo',
        obsPulsoPedio: 'Pulso pedio - Observaciones',
        pulsoTibialDer: 'Pulso tibial posterior - Pie derecho',
        pulsoTibialIzq: 'Pulso tibial posterior - Pie izquierdo',
        obsPulsoTibial: 'Pulso tibial posterior - Observaciones',
        condicionPielDer: 'Tipo/condición de piel - Pie derecho',
        condicionPielIzq: 'Tipo/condición de piel - Pie izquierdo',
        obsCondicionPiel: 'Tipo/condición de piel - Observaciones',
        coloracionPielDer: 'Coloración de la piel - Pie derecho',
        coloracionPielIzq: 'Coloración de la piel - Pie izquierdo',
        obsColoracionPiel: 'Coloración de la piel - Observaciones',
        nevosDer: 'Nevos o cambios pigmentarios - Pie derecho',
        nevosIzq: 'Nevos o cambios pigmentarios - Pie izquierdo',
        obsNevos: 'Nevos o cambios pigmentarios - Observaciones',
        heridasUlcerasDer: 'Heridas o úlceras - Pie derecho',
        heridasUlcerasIzq: 'Heridas o úlceras - Pie izquierdo',
        obsHeridasUlceras: 'Heridas o úlceras - Observaciones',
        lesionesVascularesDer: 'Lesiones de carácter vascular - Pie derecho',
        lesionesVascularesIzq: 'Lesiones de carácter vascular - Pie izquierdo',
        obsLesionesVasculares: 'Lesiones de carácter vascular - Observaciones',
        dolorPalpacionDer: 'Dolor a la palpación - Pie derecho',
        dolorPalpacionIzq: 'Dolor a la palpación - Pie izquierdo',
        obsDolorPalpacion: 'Dolor a la palpación - Observaciones',
        derivacionDer: 'Orientación o derivación sugerida - Pie derecho',
        derivacionIzq: 'Orientación o derivación sugerida - Pie izquierdo',
        obsDerivacion: 'Orientación o derivación sugerida - Observaciones',
      },
    },
    {
      title: '6. Lesiones ungueales',
      fields: {
        unasComprometidasDer: 'Uñas comprometidas - Pie derecho',
        unasComprometidasIzq: 'Uñas comprometidas - Pie izquierdo',
        obsUnasComprometidas: 'Uñas comprometidas - Observaciones',
        coloracionUngDer: 'Coloración ungueal - Pie derecho',
        coloracionUngIzq: 'Coloración ungueal - Pie izquierdo',
        obsColoracionUng: 'Coloración ungueal - Observaciones',
        grosorUngDer: 'Grosor / forma ungueal - Pie derecho',
        grosorUngIzq: 'Grosor / forma ungueal - Pie izquierdo',
        obsGrosorUng: 'Grosor / forma ungueal - Observaciones',
        onicocriptosisDer: 'Onicocriptosis - Pie derecho',
        onicocriptosisIzq: 'Onicocriptosis - Pie izquierdo',
        obsOnicocriptosis: 'Onicocriptosis - Observaciones',
        onicomicosisDer: 'Onicomicosis aparente - Pie derecho',
        onicomicosisIzq: 'Onicomicosis aparente - Pie izquierdo',
        obsOnicomicosis: 'Onicomicosis aparente - Observaciones',
        onicogrifosisDer: 'Onicogrifosis / hipertrofia - Pie derecho',
        onicogrifosisIzq: 'Onicogrifosis / hipertrofia - Pie izquierdo',
        obsOnicogrifosis: 'Onicogrifosis / hipertrofia - Observaciones',
        onicolisisDer: 'Onicolisis / desprendimiento - Pie derecho',
        onicolisisIzq: 'Onicolisis / desprendimiento - Pie izquierdo',
        obsOnicolisis: 'Onicolisis / desprendimiento - Observaciones',
        dolorPeriungDer: 'Dolor/signos inflamatorios periungueales - Pie derecho',
        dolorPeriungIzq: 'Dolor/signos inflamatorios periungueales - Pie izquierdo',
        obsDolorPeriung: 'Dolor/signos inflamatorios periungueales - Observaciones',
      },
    },
    {
      title: '7. Diagramas y topografía',
      fields: Object.assign(
        { simbologiaObs: 'Observaciones / simbología utilizada' },
        seccionSwme(),
        seccionTopografia(),
        { morfologiaAntepie: 'Morfología del antepié' }
      ),
    },
    {
      title: '8. Tratamiento e indicaciones',
      fields: {
        tratamientoTexto: 'Tratamiento realizado e indicaciones',
        podologoTratante: 'Nombre podólogo/a tratante',
      },
    },
  ];

  const COSMETOLOGIA = [
    { title: 'Consentimiento informado', fields: CONSENTIMIENTO },
    {
      title: '1. Datos personales',
      fields: {
        datNombre: 'Nombre completo',
        datRut: 'RUT / Identificación',
        datEdad: 'Edad',
        datFecha: 'Fecha',
        datTelefono: 'Teléfono',
        datCorreo: 'Correo electrónico',
      },
    },
    {
      title: '2. Motivo de consulta',
      fields: {
        motivoConsulta: 'Motivos seleccionados',
        motivoConsultaOtro: 'Especifique otro motivo',
      },
    },
    {
      title: '3. Tipo de piel',
      fields: { tipoPiel: 'Tipo de piel', tipoPielObs: 'Observaciones' },
    },
    {
      title: '4. Antecedentes médicos',
      fields: {
        enfermedad: '¿Presenta alguna enfermedad?',
        enfermedadDetalle: '¿Presenta alguna enfermedad? - Detalle',
        embarazada: '¿Está embarazada?',
        embarazadaObs: '¿Está embarazada? - Observaciones',
        medicamentos: '¿Toma medicamentos actualmente?',
        medicamentosDetalle: '¿Toma medicamentos actualmente? - Detalle',
        alergias: 'Alergias (cosméticos, medicamentos, alimentos)',
        alergiasDetalle: 'Alergias - Detalle',
      },
    },
    {
      title: '5. Antecedentes dermatológicos',
      fields: {
        haTenidoAcne: '¿Ha tenido acné?',
        haTenidoAcneDetalle: '¿Ha tenido acné? - Detalle',
        lesionesActuales: '¿Presenta lesiones actuales?',
        lesionesActualesDetalle: '¿Presenta lesiones actuales? - Detalle',
        rosacea: '¿Tiene rosácea o piel sensible?',
        rosaceaDetalle: '¿Tiene rosácea o piel sensible? - Detalle',
        tratDermatologicos: '¿Ha recibido tratamientos dermatológicos recientes?',
        tratDermatologicosDetalle: 'Tratamientos dermatológicos - Detalle',
        peelingQuimico: '¿Se ha realizado peeling químico recientemente?',
        peelingQuimicoDetalle: 'Peeling químico - Detalle',
      },
    },
    {
      title: '6. Rutina de cuidado facial',
      fields: {
        limpiaDiariamente: '¿Limpia su rostro diariamente?',
        usaProtectorSolar: '¿Usa protector solar?',
        usaCosmeticos: '¿Utiliza productos cosméticos?',
        usaCosmeticosDetalle: '¿Utiliza productos cosméticos? - Detalle',
        frecuenciaExfoliacion: 'Frecuencia de exfoliación',
      },
    },
    {
      title: '7. Hábitos y estilo de vida',
      fields: {
        consumoAgua: 'Consumo de agua',
        alimentacion: 'Alimentación',
        consumoAlcohol: 'Consumo de alcohol',
        fuma: 'Fuma',
        nivelEstres: 'Nivel de estrés',
      },
    },
    {
      title: '8. Evaluación profesional',
      fields: {
        evalTextura: 'Textura',
        poros: 'Poros',
        evalLesiones: 'Lesiones',
        nivelHidratacion: 'Nivel de hidratación',
        sensibilidad: 'Sensibilidad',
        diagnosticoEstetico: 'Diagnóstico estético',
      },
    },
    {
      title: '9. Contraindicaciones',
      fields: {
        contraindicaciones: 'Contraindicaciones seleccionadas',
        contraindicacionesOtra: 'Especifique otra',
      },
    },
    {
      title: '10. Procedimiento a realizar',
      fields: { procedimiento: 'Procedimientos seleccionados' },
    },
    {
      title: '11. Observaciones profesionales',
      fields: {
        observacionesTexto: 'Observaciones del tratamiento realizado',
        cosmetologoTratante: 'Nombre cosmetólogo/a tratante',
      },
    },
  ];

  const VALUE_LABELS = {
    consentDecision: { acepto: 'Acepto participar', rechazo: 'Rechazo participar' },
  };

  window.ClinicAppFichaFields = {
    podologia: PODOLOGIA,
    cosmetologia: COSMETOLOGIA,
    valueLabel: function (fieldName, value) {
      const dict = VALUE_LABELS[fieldName];
      return (dict && dict[value]) || value;
    },
  };
})();
