const sendCriticalResultAlert = (labResult, labOrder) => {
    console.log("===========================================");
    console.log("🚨 CRITICAL LAB RESULT ALERT");
    console.log("===========================================");
    console.log(`Lab Order ID : ${labResult.labOrderId}`);
    console.log(`Patient ID : ${labOrder.patientId}`);
    console.log(`Doctor ID : ${labOrder.doctorId}`);
    console.log(`Test Type : ${labOrder.testType}`);
    console.log(`Result : ${labResult.resultValue} ${labResult.unit}`);
    console.log(`Reference : ${labResult.referenceRange}`);
    console.log(`Result Date : ${labResult.resultDate}`);
    console.log(`Notes : ${labResult.notes}`);
    console.log("===========================================");
};

export { sendCriticalResultAlert };