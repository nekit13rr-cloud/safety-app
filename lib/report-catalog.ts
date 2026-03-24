export const RISK_OPTIONS = [
  {
    value: "risk_electric_shock",
    label: "риск поражения эл. током",
    hazards: [
      "открытые токоведущие элементы",
      "неисправность инструмента",
      "незаизолированные эл. провода",
    ],
  },
  {
    value: "risk_slip_trip_fall",
    label: "риск подскальзывания, спотыкания, падения",
    hazards: ["скользкие поверхности", "перепады высот", "открытые люки"],
  },
  {
    value: "risk_thermal_burn",
    label: "риск получения термического ожога",
    hazards: ["горячие поверхности"],
  },
  {
    value: "risk_chemical_burn",
    label: "риск получения химического ожога",
    hazards: ["пролив/разлив концентрированной кислоты/щелочи"],
  },
  {
    value: "risk_limb_injury",
    label: "риск травмирования конечностей",
    hazards: ["вращающиеся, движущиеся элементы оборудования"],
  },
  {
    value: "risk_clamping",
    label: "риск зажатия",
    hazards: ["ограниченный/труднодоступный доступ к оборудованию"],
  },
  {
    value: "risk_cut",
    label: "риск пореза",
    hazards: ["открытые колющие/режущие части оборудования"],
  },
  {
    value: "risk_bruise",
    label: "риск ушиба",
    hazards: ["конструктив оборудования, элементы размещены так, что возможен удар"],
  },
  {
    value: "risk_fall_height",
    label: "риск падения с высоты",
    hazards: ["ненадежность конструкции страховочной системы"],
  },
  {
    value: "risk_fall_level_change",
    label: "риск падения при перепаде высот",
    hazards: ["ненадежные конструкции, площадки, приспособления"],
  },
];

export function getHazardsByRisk(riskValue: string) {
  return RISK_OPTIONS.find((item) => item.value === riskValue)?.hazards ?? [];
}