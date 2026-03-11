import type { Department } from "../types/department";

export const DEPARTMENTS: Record<string, Department> = {
  hospital: {
    label:"Hospital", icon:"🏥", color:"#00b4d8", accent:"#0077b6",
    summary:"A mid-size hospital processes ~300 encounters/day. 35% of physician time is documentation. Revenue cycle leaks ~12% of charges to billing errors and denials.",
    valueChain:["Patient presents → Triage → Assessment → Diagnosis → Treatment order → Pharmacy → Nursing execution → Monitoring → Discharge → Billing → Follow-up"],
    roles:[
      {id:"physician",label:"Attending Physician",x:50,y:28,icon:"👨‍⚕️"},
      {id:"nurse",label:"Floor Nurse",x:22,y:52,icon:"👩‍⚕️"},
      {id:"admin",label:"Admin / RCM",x:78,y:52,icon:"🗂️"},
      {id:"lab",label:"Lab Technician",x:50,y:72,icon:"🔬"},
      {id:"patient",label:"Patient",x:14,y:28,icon:"🛏️"},
      {id:"pharmacy",label:"Pharmacist",x:78,y:28,icon:"💊"},
    ],
    workflows:[
      {id:"w1",from:"patient",to:"nurse",label:"Vitals intake",type:"physical",aiImpact:"high",valueFlow:"valueCreate"},
      {id:"w2",from:"nurse",to:"physician",label:"Chart update",type:"knowledge",aiImpact:"high",valueFlow:"costSink"},
      {id:"w3",from:"physician",to:"admin",label:"Orders / billing codes",type:"knowledge",aiImpact:"high",valueFlow:"costSink"},
      {id:"w4",from:"physician",to:"lab",label:"Lab order",type:"knowledge",aiImpact:"medium",valueFlow:"valueCreate"},
      {id:"w5",from:"lab",to:"physician",label:"Results report",type:"knowledge",aiImpact:"high",valueFlow:"valueCreate"},
      {id:"w6",from:"admin",to:"physician",label:"Prior auth delay",type:"knowledge",aiImpact:"medium",valueFlow:"valueLeak"},
      {id:"w7",from:"physician",to:"pharmacy",label:"Medication order",type:"knowledge",aiImpact:"high",valueFlow:"valueCreate"},
      {id:"w8",from:"pharmacy",to:"nurse",label:"Dispensed meds",type:"physical",aiImpact:"medium",valueFlow:"riskNode"},
    ],
    sensors:[
      {id:"s1",role:"patient",sense:"sight",label:"Facial pain / skin color",detail:"Pallor, jaundice, cyanosis, distress",aiNote:"Vision AI detects pain scale, jaundice, oxygen distress continuously. WEF 2024: reduces review time 40%",icon:"👁️"},
      {id:"s2",role:"patient",sense:"sound",label:"Breath & cardiac sounds",detail:"Wheeze, stridor, murmur, rate",aiNote:"Audio ML on room microphone flags abnormal breath sounds 24/7. Cleveland Clinic sepsis AI: 18% mortality reduction",icon:"👂"},
      {id:"s3",role:"patient",sense:"smell",label:"Wound / metabolic odor",detail:"Infection markers, ketoacidosis, GI bleed",aiNote:"E-nose spectroscopy detects infection signatures before visible symptoms. Applicable in resource-limited African wards",icon:"👃"},
      {id:"s4",role:"nurse",sense:"touch",label:"IV line / skin turgor",detail:"Line pressure, edema, dehydration",aiNote:"IoT pressure sensors monitor IV lines continuously. Haptic feedback gloves in development",icon:"✋"},
      {id:"s5",role:"physician",sense:"sight",label:"Imaging interpretation",detail:"X-ray, CT, MRI, pathology slides",aiNote:"FDA approved 950+ AI/ML medical devices by 2024. Radiology AI matches specialist accuracy at 24/7 throughput",icon:"👁️"},
      {id:"s6",role:"physician",sense:"sound",label:"Patient spoken history",detail:"Unstructured verbal symptom narration",aiNote:"Ambient AI scribe (Nuance DAX) reduces doc time 4–6hrs/week. Kaiser Permanente: 2.5M AI-assisted interactions yr 1",icon:"👂"},
    ],
    knowledgeWork:[
      {id:"k1",role:"physician",label:"Differential diagnosis",effort:9,frequency:"Per visit",aiImpact:"supercharge",aiNote:"AI surfaces ranked differentials from symptoms + labs. Saves minutes per visit × 300 visits/day.",costPerYear:"$18K/physician",valueAtStake:"Missed diagnoses cost $40K+ per adverse event"},
      {id:"k2",role:"physician",label:"Clinical documentation (EHR)",effort:8,frequency:"Per visit",aiImpact:"shortcircuit",aiNote:"Ambient AI drafts note from conversation. AMA: 49% physician burnout rate, documentation is top driver.",costPerYear:"$110K/physician annually",valueAtStake:"Burnout costs $500K–$1M per physician to replace"},
      {id:"k3",role:"nurse",label:"Medication reconciliation",effort:7,frequency:"Per shift",aiImpact:"supercharge",aiNote:"AI cross-checks all meds for interactions in seconds. Manual process misses ~15% of interactions.",costPerYear:"$22K/nurse",valueAtStake:"Medication errors: 1.5M/year in US, $3.5B in costs"},
      {id:"k4",role:"admin",label:"Prior authorization",effort:9,frequency:"Daily",aiImpact:"shortcircuit",aiNote:"70% of health plans prioritizing agentic AI for prior auth (Deloitte 2025).",costPerYear:"$46K per FTE",valueAtStake:"Delays lead to AMA-documented patient harm and treatment abandonment"},
      {id:"k5",role:"admin",label:"Billing & coding",effort:7,frequency:"Per visit",aiImpact:"shortcircuit",aiNote:"Auburn Community Hospital: 40%+ coder productivity gain. Revenue cycle AI at 46% hospital adoption.",costPerYear:"$38K per FTE",valueAtStake:"12% average revenue leak from coding errors"},
      {id:"k6",role:"lab",label:"Anomaly flagging in results",effort:6,frequency:"Continuous",aiImpact:"supercharge",aiNote:"Cleveland Clinic sepsis AI: 18% mortality reduction from early detection.",costPerYear:"$18K/lab FTE",valueAtStake:"Missed critical values: direct patient mortality risk"},
    ],
    agents:[
      {id:"a1",name:"Ambient Scribe",type:"web",taskIds:["k2"],trigger:"Physician-patient encounter begins",output:"Structured SOAP note draft in EHR",humanInLoop:"Physician reviews before signing",integrations:["Epic EHR","Nuance DAX API"],priority:1,complexity:"medium",mobileFirst:false},
      {id:"a2",name:"Prior Auth Agent",type:"web",taskIds:["k4"],trigger:"Order requiring authorization placed",output:"Completed auth request, appeal if denied",humanInLoop:"Physician approves clinical justification",integrations:["Availity","Payer portals"],priority:2,complexity:"high",mobileFirst:false},
      {id:"a3",name:"Vitals Monitor",type:"edge",taskIds:["s1","s2"],trigger:"Continuous bedside sensor data",output:"Alert if vitals deviate from baseline",humanInLoop:"Nurse acknowledges and escalates",integrations:["Bedside monitors","Nurse call system"],priority:2,complexity:"medium",mobileFirst:false},
      {id:"a4",name:"Med Rec Agent",type:"web",taskIds:["k3"],trigger:"Admission or shift handoff",output:"Reconciled medication list with interaction flags",humanInLoop:"Pharmacist reviews flagged interactions",integrations:["EHR","Formulary API"],priority:3,complexity:"low",mobileFirst:false},
    ]
  },
  school: {
    label:"Public School", icon:"🏫", color:"#f4a261", accent:"#e76f51",
    summary:"A typical US public school: 1 teacher per 16 students. Teachers spend 50% of non-classroom time on admin. IEP compliance alone consumes 7–10 hrs per student per year. NYC DOE: 200K+ IEPs annually.",
    valueChain:["Enrollment → Intake assessment → Instruction → Formative assessment → Intervention → Progress monitoring → Reporting → Promotion/graduation"],
    roles:[
      {id:"principal",label:"Principal",x:50,y:18,icon:"👩‍💼"},
      {id:"teacher",label:"Classroom Teacher",x:22,y:48,icon:"👨‍🏫"},
      {id:"student",label:"Student",x:14,y:70,icon:"🎒"},
      {id:"counselor",label:"School Counselor",x:78,y:48,icon:"💬"},
      {id:"sped",label:"Special Ed Coordinator",x:78,y:70,icon:"📋"},
      {id:"admin",label:"Admin Office",x:50,y:70,icon:"🏛️"},
    ],
    workflows:[
      {id:"w1",from:"student",to:"teacher",label:"Assignment submission",type:"knowledge",aiImpact:"high",valueFlow:"valueCreate"},
      {id:"w2",from:"teacher",to:"sped",label:"IEP data / referral",type:"knowledge",aiImpact:"high",valueFlow:"costSink"},
      {id:"w3",from:"sped",to:"principal",label:"IEP compliance report",type:"knowledge",aiImpact:"high",valueFlow:"costSink"},
      {id:"w4",from:"teacher",to:"counselor",label:"At-risk student referral",type:"knowledge",aiImpact:"high",valueFlow:"valueCreate"},
      {id:"w5",from:"admin",to:"teacher",label:"Attendance / alerts",type:"knowledge",aiImpact:"medium",valueFlow:"riskNode"},
      {id:"w6",from:"teacher",to:"principal",label:"Progress reports",type:"knowledge",aiImpact:"high",valueFlow:"costSink"},
    ],
    sensors:[
      {id:"s1",role:"teacher",sense:"sight",label:"Student engagement signals",detail:"Eye contact, on-task vs distracted, confusion",aiNote:"Vision AI engagement monitoring — used experimentally; reading fluency AI scores oral reading in real time",icon:"👁️"},
      {id:"s2",role:"teacher",sense:"sound",label:"Classroom acoustic environment",detail:"On-task conversation vs off-task noise",aiNote:"Audio AI classifies learning activity types. Amplify reading fluency AI scores oral reading with diagnostic accuracy",icon:"👂"},
      {id:"s3",role:"student",sense:"touch",label:"Device interaction patterns",detail:"Typing rhythm, hesitation, navigation",aiNote:"Keystroke dynamics detect learning struggles, frustration, or academic dishonesty in real time",icon:"✋"},
    ],
    knowledgeWork:[
      {id:"k1",role:"teacher",label:"Lesson planning",effort:8,frequency:"Weekly",aiImpact:"supercharge",aiNote:"AI generates differentiated lesson plans by reading level and IEP accommodation. Currently 3–8 hrs/week manual.",costPerYear:"$14K/teacher",valueAtStake:"Undifferentiated instruction: 30% of students disengage"},
      {id:"k2",role:"sped",label:"IEP documentation",effort:10,frequency:"Per student/year",aiImpact:"shortcircuit",aiNote:"AI auto-drafts IEP goals from assessment data. NYC DOE: 200K+ IEPs/year at 7–10 hrs each manually.",costPerYear:"$22K/SPED coordinator",valueAtStake:"IEP compliance failures: $50K+ litigation per case"},
      {id:"k3",role:"teacher",label:"Assignment grading & feedback",effort:7,frequency:"Weekly",aiImpact:"supercharge",aiNote:"AI grades open-ended work with rubric alignment. Turnitin, Gradescope, Khanmigo deployed at scale.",costPerYear:"$18K/teacher",valueAtStake:"Delayed feedback reduces retention by up to 50%"},
      {id:"k4",role:"counselor",label:"Student risk assessment",effort:8,frequency:"Ongoing",aiImpact:"supercharge",aiNote:"AI surfaces early warnings from grades, behavior, attendance. Counselors focus on flagged students vs scanning 300+ manually.",costPerYear:"$16K/counselor",valueAtStake:"1 prevented dropout = $250K in lifetime tax revenue (RAND 2023)"},
    ],
    agents:[
      {id:"a1",name:"IEP Draft Agent",type:"web",taskIds:["k2"],trigger:"New IEP cycle begins for student",output:"Draft IEP goals from prior assessments + notes",humanInLoop:"SPED coordinator reviews and edits before meeting",integrations:["Student information system","Prior IEP docs"],priority:1,complexity:"medium",mobileFirst:false},
      {id:"a2",name:"Early Warning Agent",type:"web",taskIds:["k4"],trigger:"Weekly data sync from SIS",output:"Ranked at-risk student list with evidence",humanInLoop:"Counselor reviews and contacts flagged students",integrations:["SIS","Attendance system"],priority:2,complexity:"low",mobileFirst:false},
      {id:"a3",name:"Lesson Planner",type:"web",taskIds:["k1"],trigger:"Teacher requests weekly plan",output:"Differentiated lesson plan by student level",humanInLoop:"Teacher adjusts before use",integrations:["Curriculum library","IEP system"],priority:3,complexity:"low",mobileFirst:false},
    ]
  },
  dispatch: {
    label:"Emergency Dispatch", icon:"🚨", color:"#ef4444", accent:"#b91c1c",
    summary:"82% of emergency dispatch centers are understaffed. 60%+ of 911 calls are non-emergency. Average call-to-dispatch: 3–8 min. Misrouted calls cost lives. Aurelian AI reduced call volume 30% in live deployment.",
    valueChain:["Call received → Triage → Unit dispatch → En route → On-scene → Incident close → After-action"],
    roles:[
      {id:"dispatcher",label:"Dispatcher",x:50,y:28,icon:"🎧"},
      {id:"caller",label:"Caller / Public",x:20,y:20,icon:"📞"},
      {id:"supervisor",label:"Supervisor",x:78,y:28,icon:"👮"},
      {id:"field",label:"Field Unit",x:28,y:72,icon:"🚓"},
      {id:"hospital_d",label:"Hospital / Dest.",x:72,y:72,icon:"🏥"},
    ],
    workflows:[
      {id:"w1",from:"caller",to:"dispatcher",label:"911 call intake",type:"physical",aiImpact:"high",valueFlow:"riskNode"},
      {id:"w2",from:"dispatcher",to:"field",label:"Unit dispatch",type:"knowledge",aiImpact:"high",valueFlow:"valueCreate"},
      {id:"w3",from:"field",to:"dispatcher",label:"Status update",type:"knowledge",aiImpact:"medium",valueFlow:"valueCreate"},
      {id:"w4",from:"dispatcher",to:"hospital_d",label:"Patient pre-notify",type:"knowledge",aiImpact:"high",valueFlow:"valueCreate"},
      {id:"w5",from:"supervisor",to:"dispatcher",label:"Protocol guidance",type:"knowledge",aiImpact:"medium",valueFlow:"costSink"},
      {id:"w6",from:"dispatcher",to:"supervisor",label:"Escalation",type:"knowledge",aiImpact:"high",valueFlow:"riskNode"},
    ],
    sensors:[
      {id:"s1",role:"dispatcher",sense:"sound",label:"Caller voice / background audio",detail:"Caller emotional state, gunshots, screaming, sirens",aiNote:"Audio AI extracts background sounds and caller stress level for faster incident type classification. Reduces triage time by 40%.",icon:"👂"},
      {id:"s2",role:"dispatcher",sense:"sight",label:"CAD map & unit positions",detail:"Real-time unit locations, traffic, incident density",aiNote:"AI recommends nearest available unit accounting for traffic, specialty, and current workload. 90 seconds saved per dispatch on average.",icon:"👁️"},
    ],
    knowledgeWork:[
      {id:"k1",role:"dispatcher",label:"Incident type classification",effort:8,frequency:"Per call",aiImpact:"supercharge",aiNote:"AI pre-classifies call type from first 10 seconds of audio. Reduces dispatcher cognitive load by 60%.",costPerYear:"$28K/dispatcher",valueAtStake:"Misclassification delays response — directly impacts survival rates"},
      {id:"k2",role:"dispatcher",label:"Non-emergency call deflection",effort:6,frequency:"Per call",aiImpact:"shortcircuit",aiNote:"AI handles 311-type calls autonomously. Aurelian deployment: 30% total call volume reduction.",costPerYear:"$35K/FTE in non-emergency handling",valueAtStake:"Staffing crisis: 82% of centers understaffed"},
      {id:"k3",role:"supervisor",label:"After-action documentation",effort:5,frequency:"Per shift",aiImpact:"shortcircuit",aiNote:"AI generates incident reports from CAD logs + call recordings. Saves 45 min/shift of admin time.",costPerYear:"$12K/supervisor",valueAtStake:"Incomplete reports block quality improvement cycles"},
    ],
    agents:[
      {id:"a1",name:"Call Triage Agent",type:"web",taskIds:["k1","s1"],trigger:"Call connects to dispatch center",output:"Incident type, priority, suggested protocol",humanInLoop:"Dispatcher confirms classification",integrations:["CAD system","911 audio stream"],priority:1,complexity:"high",mobileFirst:false},
      {id:"a2",name:"Non-Emergency Handler",type:"web",taskIds:["k2"],trigger:"Call identified as non-emergency",output:"Caller routed to correct agency or resolved",humanInLoop:"Human override available at any point",integrations:["311 system","City service directory"],priority:2,complexity:"medium",mobileFirst:false},
      {id:"a3",name:"Unit Recommender",type:"orch",taskIds:["s2"],trigger:"Dispatch decision point",output:"Ranked unit recommendations with ETA",humanInLoop:"Dispatcher selects final unit",integrations:["AVL/GPS system","Traffic API"],priority:2,complexity:"medium",mobileFirst:false},
    ]
  },
  infrastructure: {
    label:"Water & Infrastructure", icon:"🚰", color:"#06b6d4", accent:"#0e7490",
    summary:"240K water main breaks/year in the US, costing $60B in repairs. 9M+ lead pipes still in service. Acoustic AI catches leaks weeks before surface breaks. AI-driven predictive maintenance saves 3–5× vs reactive response.",
    valueChain:["Source monitoring → Treatment → Distribution → Pressure management → Quality monitoring → Customer service → Maintenance dispatch → Asset management → Capital planning"],
    roles:[
      {id:"ops_director",label:"Operations Director",x:50,y:14,icon:"🏭"},
      {id:"engineer_inf",label:"Systems Engineer",x:82,y:40,icon:"⚙️"},
      {id:"field_tech",label:"Field Technician",x:14,y:58,icon:"🔧"},
      {id:"control_room",label:"Control Room Operator",x:50,y:44,icon:"🖥️"},
      {id:"inspector_inf",label:"Infrastructure Inspector",x:22,y:78,icon:"🦺"},
      {id:"public_inf",label:"Public / Service Area",x:82,y:72,icon:"🏠"},
    ],
    workflows:[
      {id:"w1",from:"control_room",to:"field_tech",label:"Maintenance dispatch",type:"knowledge",aiImpact:"high",valueFlow:"valueCreate"},
      {id:"w2",from:"field_tech",to:"control_room",label:"Fault status report",type:"physical",aiImpact:"high",valueFlow:"valueCreate"},
      {id:"w3",from:"inspector_inf",to:"engineer_inf",label:"Asset condition report",type:"knowledge",aiImpact:"high",valueFlow:"valueCreate"},
      {id:"w4",from:"engineer_inf",to:"ops_director",label:"Capital maintenance plan",type:"knowledge",aiImpact:"medium",valueFlow:"riskNode"},
      {id:"w5",from:"public_inf",to:"control_room",label:"Service complaint / outage",type:"knowledge",aiImpact:"medium",valueFlow:"valueCreate"},
      {id:"w6",from:"control_room",to:"ops_director",label:"System anomaly escalation",type:"knowledge",aiImpact:"high",valueFlow:"riskNode"},
    ],
    sensors:[
      {id:"s1",role:"control_room",sense:"sight",label:"SCADA telemetry dashboards",detail:"Flow rates, pressure, valve states, pump performance",aiNote:"AI monitors 10,000s of SCADA data points simultaneously. Predicts pump failure 24–72 hrs before occurrence.",icon:"👁️"},
      {id:"s2",role:"field_tech",sense:"sound",label:"Pipe acoustic leak detection",detail:"Pressure wave signatures, micro-leak sounds",aiNote:"Acoustic AI detects micro-leaks weeks before surface breaks. AI intervention could prevent 30–40% of 240K annual breaks.",icon:"👂"},
      {id:"s3",role:"field_tech",sense:"smell",label:"Chemical / contamination detection",detail:"Chlorine residual, sewage intrusion, industrial spill",aiNote:"IoT inline chemical sensors + AI: 30-min warning vs 24–48 hr lab testing. Critical for lead detection compliance.",icon:"👃"},
    ],
    knowledgeWork:[
      {id:"k1",role:"control_room",label:"Anomaly detection & triage",effort:9,frequency:"Continuous",aiImpact:"supercharge",aiNote:"AI triages alerts by severity, correlates cross-sensor patterns. Operators receive 100s of alerts/day — 95% non-critical.",costPerYear:"$55K/operator",valueAtStake:"Undetected main break: avg $350K emergency repair + $2M property damage"},
      {id:"k2",role:"engineer_inf",label:"Predictive maintenance scheduling",effort:8,frequency:"Monthly",aiImpact:"shortcircuit",aiNote:"AI schedules work orders by failure probability × consequence. Extends asset life 20–30%.",costPerYear:"$45K/engineer",valueAtStake:"Reactive maintenance: 3–5× more expensive. $60B/year in avoidable US costs"},
      {id:"k3",role:"inspector_inf",label:"Infrastructure condition scoring",effort:7,frequency:"Quarterly",aiImpact:"supercharge",aiNote:"Drone + CV inspects 5–10 miles/day vs 0.5 miles for human team. Essential for EPA lead pipe inventory.",costPerYear:"$38K/inspector",valueAtStake:"Unidentified lead pipes: Flint MI crisis cost $400M+"},
    ],
    agents:[
      {id:"a1",name:"Anomaly Triage Agent",type:"edge",taskIds:["k1","s1"],trigger:"SCADA alert threshold crossed",output:"Severity-ranked alert with recommended action",humanInLoop:"Operator approves any system changes",integrations:["SCADA","GIS","Work order system"],priority:1,complexity:"high",mobileFirst:false},
      {id:"a2",name:"Acoustic Leak Monitor",type:"edge",taskIds:["s2"],trigger:"Continuous pipe sensor data",output:"Leak probability score per pipe segment",humanInLoop:"Engineer reviews before dispatching crew",integrations:["Acoustic sensor network","GIS"],priority:1,complexity:"high",mobileFirst:false},
      {id:"a3",name:"Field Report Agent",type:"mobile",taskIds:["k3"],trigger:"Inspector completes field assessment",output:"Standardized condition score + work order",humanInLoop:"Engineer reviews before scheduling",integrations:["Mobile camera","Asset database","Work order system"],priority:2,complexity:"low",mobileFirst:true},
    ]
  },
};

export const EMPTY_CUSTOM: Department = {
  label:"My Department", icon:"🏢", color:"#00b4d8", accent:"#0077b6",
  summary:"", roles:[], workflows:[], sensors:[], knowledgeWork:[], agents:[], _isCustom:true
};
