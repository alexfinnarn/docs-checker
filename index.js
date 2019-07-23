/**
 * This is the main entrypoint to your Probot app
 * @param {import('probot').Application} app
 */
module.exports = app => {
  // Your code here
  app.log('Yay, the app was loaded!')

  app.on('issues.opened', async context => {
    const issueComment = context.issue({ body: 'Not you because you\'re unemployed!!!' })
    return context.github.issues.createComment(issueComment)
  })

  app.on(['pull_request.opened', 'pull_request.reopened', 'pull_request.edited'], async context => {
    const config = await context.config('docs-checker.yml', {
      minChangedLines: 40,
      docscheck: true
    });
    const issue = context.issue();
    
    const allFiles = await context.github.paginate(
      context.github.pullRequests.listFiles(issue),
      (res) => res.data,
    );

    // Get all the added lines into one array.
    // The patch property had all the info I needed at the time.
    const actualChanges = allFiles.map(e => e.patch.split('\n').filter(f => f.startsWith('+')));
    const flatLines = flatten(...actualChanges);
    
    // Only be a dick when they've change enough lined of code.
    if (flatLines.length > config.minChangedLines && flatLines.filter(e => e.startsWith('+//')).length === 0) {
      const issueComment = context.issue({ body: 'You changed a lot of lines of code but did not add any comments. Shame on you! Shame!!!' });
      context.github.issues.createComment(issueComment);
    }

    if (config.docscheck) {
      const statusesToCheck = ['removed', 'added'];
      const docsNeedToBeChecked = allFiles.filter(e => statusesToCheck.includes(e.status)); 

      if (docsNeedToBeChecked.length > 0 && allFiles.filter(e => e.filename.startsWith('docs')).length === 0) {
        const issueComment = context.issue({ body: 'You added and/or removed files but didn\'t make any docs changes. What the hell\'s wrong with you?!?!'});
        context.github.issues.createComment(issueComment);
      } 
    }
  })

  // For more information on building apps:
  // https://probot.github.io/docs/

  // To get your app running against GitHub, see:
  // https://probot.github.io/docs/development/
}

/**
 * Combines multiple nested arrays into one flat array.
 * 
 * @param {Array} arr 
 * @param {Array} result 
 */
const flatten = function(arr, result = []) {
  for (let i = 0, length = arr.length; i < length; i++) {
    const value = arr[i];
    if (Array.isArray(value)) {
      flatten(value, result);
    } else {
      result.push(value);
    }
  }
  return result;
};