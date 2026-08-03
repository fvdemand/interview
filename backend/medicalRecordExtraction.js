

const SUMMARIZE_AND_EXTRACT_MEDICAL_RECORD = `Provide a summary of patients medical record make sure to include any bills. {CHUNK_TEXT}`;

const processAi = async (medicalRecordText, extractionPrompt) => {
    const summary = runLLM({
        prompt: SUMMARIZE_AND_EXTRACT_MEDICAL_RECORD.replace('{CHUNK_TEXT}', medicalRecordText),
        thinking:true
    })
}