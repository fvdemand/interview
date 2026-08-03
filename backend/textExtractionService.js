
async function textractPdfFile(pdfBuffer, maxPagesPerChunk, s3FilePath, metaData, pageCount, caseProcessingContext) {
  // If document is small enough, process directly
  if (pageCount <= maxPagesPerChunk) {
    caseProcessingContext.caseConsoleLogger('Document is small enough to process directly');
    try {
      const jobID = await startTextractJob(s3FilePath);
      await isTextractJobComplete(jobID, caseProcessingContext);
      const textractResult = await getTextractJobResults(jobID);

      return textractResult;
    } catch (error) {
      await caseProcessingContext.caseErrorLoggerAsyncFn(500, `Error processing document directly: ${error.message}`);
      throw error;
    }
  }

  const numChunks = Math.ceil(pageCount / maxPagesPerChunk);

  // STEP 1
  caseProcessingContext.caseConsoleLogger(`STEP 1: Splitting PDF into ${numChunks} chunks in parallel`);
  const chunkDefinitions = [];

  for (let chunkIndex = 0; chunkIndex < numChunks; chunkIndex++) {
    const fromPageNumber = chunkIndex * maxPagesPerChunk + 1;
    const toPageNumber = Math.min((chunkIndex + 1) * maxPagesPerChunk, pageCount);

    chunkDefinitions.push({
      chunkIndex,
      fromPageNumber,
      toPageNumber,
      chunkKey: s3FilePath.replace(/(\.[a-zA-Z0-9]+)$/, `-pages-${fromPageNumber}-${toPageNumber}$1`)
    });
  }

  const splittingPromises = chunkDefinitions.map(async (chunk) => {
    try {
      caseProcessingContext.caseConsoleLogger(`Splitting chunk ${chunk.chunkIndex + 1}/${numChunks}: pages ${chunk.fromPageNumber}-${chunk.toPageNumber}`);

      const chunkBuffer = await splitPdf({
        pdfBuffer,
        fromPageNumber: chunk.fromPageNumber,
        toPageNumber: chunk.toPageNumber
      });

      return {
        ...chunk,
        buffer: chunkBuffer
      };
    } catch (error) {
      await caseProcessingContext.caseErrorLoggerAsyncFn(500, `Error splitting chunk ${chunk.chunkIndex + 1}: ${error.message}`);
      throw error;
    }
  });

  let splitResults;
  try {
    splitResults = await Promise.all(splittingPromises);
    caseProcessingContext.caseConsoleLogger(`Successfully split all ${numChunks} chunks`);
  } catch (error) {
    await caseProcessingContext.caseErrorLoggerAsyncFn(500, `Failed during PDF splitting phase: ${error.message}`);
    throw error;
  }

  // STEP 2 upload to s3
  caseProcessingContext.caseConsoleLogger(`STEP 2: Uploading all ${splitResults.length} chunks to S3 in parallel`);

  const uploadPromises = splitResults.map(async (chunk) => {
    try {
      caseProcessingContext.caseConsoleLogger(`Uploading chunk ${chunk.chunkIndex + 1}/${numChunks} to S3: ${chunk.chunkKey}`);

      await putObjectToS3({
        Key: chunk.chunkKey,
        Body: chunk.buffer,
        Metadata: metaData
      });

      return {
        chunkIndex: chunk.chunkIndex,
        chunkKey: chunk.chunkKey,
        pageRange: { from: chunk.fromPageNumber, to: chunk.toPageNumber }
      };
    } catch (error) {
      await caseProcessingContext.caseErrorLoggerAsyncFn(500, `Error uploading chunk ${chunk.chunkIndex + 1} to S3:${error.message}`);
      throw error;
    }
  });

  let uploadedChunks;
  try {
    uploadedChunks = await Promise.all(uploadPromises);
    caseProcessingContext.caseConsoleLogger(`Successfully uploaded all ${uploadedChunks.length} chunks to S3`);
  } catch (error) {
    await caseProcessingContext.caseErrorLoggerAsyncFn(500, `Failed during S3 upload phase:${error.message}`);

    const cleanupPromises = splitResults.map((chunk) =>
      deleteFileFromS3(chunk.chunkKey).catch((e) => caseProcessingContext.caseErrorLoggerAsyncFn(500, `Failed to delete ${chunk.chunkKey}:${e.message}`))
    );

    await Promise.allSettled(cleanupPromises);
    throw error;
  }

  // STEP 3 process with textract
  caseProcessingContext.caseConsoleLogger(`STEP 3: Processing all ${uploadedChunks.length} chunks with Textract in parallel`);

  const textractPromises = uploadedChunks.map(async (chunk) => {
    try {
      caseProcessingContext.caseConsoleLogger(`Processing chunk ${chunk.chunkIndex + 1}/${numChunks} with Textract: pages ${chunk.pageRange.from}-${chunk.pageRange.to}`);

      const jobID = await startTextractJob(chunk.chunkKey);
      caseProcessingContext.caseConsoleLogger(`Started Textract ${jobID} for chunk ${chunk.chunkIndex + 1}`);

      await isTextractJobComplete(jobID, caseProcessingContext);
      caseProcessingContext.caseConsoleLogger(`Textract ${jobID} completed for chunk ${chunk.chunkIndex + 1}`);

      const textractResult = await getTextractJobResults(jobID);

      await deleteFileFromS3(chunk.chunkKey);
      caseProcessingContext.caseConsoleLogger(`Cleaned up S3 chunk ${chunk.chunkIndex + 1}: ${chunk.chunkKey}`);

      return {
        pageCount: chunk.pageRange.to - chunk.pageRange.from + 1,
        pageRange: chunk.pageRange,
        textractResult
      };
    } catch (error) {
      await caseProcessingContext.caseErrorLoggerAsyncFn(500, `Error processing chunk ${chunk.chunkIndex + 1} with Textract:${error.message}`);
      try {
        await deleteFileFromS3(chunk.chunkKey);
        caseProcessingContext.caseConsoleLogger(`Cleaned up failed S3 chunk: ${chunk.chunkKey}`);
      } catch (cleanupError) {
        await caseProcessingContext.caseErrorLoggerAsyncFn(500, `Warning: Failed to clean up S3 chunk: ${chunk.chunkKey} ${cleanupError.message}`);
      }

      throw error;
    }
  });

  try {
    const textractResults = await Promise.all(textractPromises);
    caseProcessingContext.caseConsoleLogger(`Successfully processed all ${textractResults.length} chunks with Textract`);

    const combinedTextractResults = textractResults.flatMap((textract) =>
      textract.textractResult.map((element) => ({
        pageNumber: element.pageNumber + textract.pageRange.from - 1,
        text: element.text
      }))
    );

    return combinedTextractResults;
  } catch (error) {
    await caseProcessingContext.caseErrorLoggerAsyncFn(500, `Failed during Textract processing phase:${error.message}`);

    const cleanupPromises = uploadedChunks.map((chunk) =>
      deleteFileFromS3(chunk.chunkKey).catch((e) => caseProcessingContext.caseErrorLoggerAsyncFn(500, `Failed to delete ${chunk.chunkKey}:${e.message}`))
    );

    await Promise.allSettled(cleanupPromises);
    throw error;
  }
}



//which parts are in parallel? 

async function getTextractAndGhostscriptResults(
  s3FilePath,
  exhibitDirectoryName,
  fileIndex,
  caseProcessingContext,
) {
  const { caseId, caseConsoleLogger, caseErrorLoggerAsyncFn } = caseProcessingContext;
  await validateJobContinuation({ caseProcessingContext });
  const maxPagesPerChunk = 200;
  const s3PathSplitArr = s3FilePath?.split('/');
  const s3ExhibitPath = s3PathSplitArr?.slice(0, -2)?.join('/');
  const fileName = path.basename(s3FilePath).split('.')[0];
  try {
    const object = await getFileFromS3(s3FilePath);
    const metaData = object.Metadata;
    caseProcessingContext.fileMetaData = metaData;
    const pdfBuffer = object.Body;

    const pageCount = await robustCountPdfPages(pdfBuffer);

    caseConsoleLogger(`${s3FilePath} has ${pageCount} pages`);

    const imagesBufferArrPromise = convertExhibitFiles(pdfBuffer, caseId);

    const chunkProcessingPromises = textractPdfFile(
      pdfBuffer,
      maxPagesPerChunk,
      s3FilePath,
      metaData,
      pageCount,
      caseProcessingContext
    );

    const [rawTextractResults, imagesBufferArr] = await Promise.all([chunkProcessingPromises, imagesBufferArrPromise]);
    caseConsoleLogger(`${s3FilePath} done with textract and ghostscript`);

    const combinedTextractResults = convertTextractResultsToStrings(rawTextractResults);

    const exhibitDirectoryPath = getExhibitDirectoryPath(s3ExhibitPath, exhibitDirectoryName, fileName);
    const exhibitPagesS3UrlPaths = await uploadExhibitsToS3(
      imagesBufferArr,
      exhibitDirectoryPath,
      fileIndex,
      combinedTextractResults,
      caseProcessingContext
    );

    return {
      exhibitPagesS3UrlPaths,
      metaData,
      combinedTextractResults,
      pageCount,
      fileName,
      s3FilePath
    };
  } catch (error) {
    await caseErrorLoggerAsyncFn(500, `Error processing PDF ${error.message}`);
    throw error;
  }
}