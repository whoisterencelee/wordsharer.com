## Editor

Looks like [Prose](Prose.io "Prose") already has most of the features I want to create for the editor + github content management. It's using [CodeMirror](CodeMirror.net "CodeMirror") editor which is fast and already well developed.

Notes on Prose
- Prose is mainly composed of backbone + codemirror, with backbone handling the UI with Model View Controller design
- view starts with app/views/start.js which creates user authentication page
- start with boot.js
  - starts the user model and authenication
- server is really simple, 

There is www.penflip.com which a fork of prose, and it's already charging for use.  It's also having difficulties figuring out the comment situation.  But it seems to have the pull/push mechanism figured out.  And the sharing part.  There is some hint of the propagtion part which they call discover.

Let's integrate Prose into wordsharer and work on the 'propagation' mandate.

Here are some features which should be added to prose to make it a wordsharer editor
- [ ] ** edit notes **
  - mainly used to explain large deletion
  - should not appear in the final document because they are raw discussions
    - removed when preview
    - option to remove when share/publish
  - are only made within edit mode
  - [ ] create markdown sytnax // explain // whenever the delete key is pressed, so that the edit note is at the spot where the delete occurs, listen to delete keypress with codemirror 
- [ ] ** comments **
  - [ ] use marktext method to create comment mark in preview mode
    - [ ] use widget (not gutter) to add comment bubble
      - addwidget can give precise location
        - [ ] make the widget above line and have a small logo
      - linewidget allow longer annotation that doesn't block

Maybe the question is markup annotation vs html annotation?  The model should follow how people edit articles, they use a red marker and circle the issue and write a small explaination on the side.

~~this is to be deleleted~~ // because it is just an example //

Comments are a little different.

Maybe in the editor when you delete, the 

- [ ] ** update highlight **
  - prose has a showdiff method which is used to show changes before commit
  - [ ] borrow this and allow showing diffs between commits
  - [ ] find out the last commit of this user as the original text
- [ ] vim keymap
- [ ] local storage for offline/disconnect recovery

## Propagation

Allow people to clone the word so they can make improvements or save into their personal library and which they can make their own annotations.

When people modify their version they can push it back to original sharer.

Let people save webpages into their library, so they are currating articles.  And let them have a one line summary for the article.

Let people share their words with whom they choose, like email.

Once a word is shared, any updates notifies sharees.

Publish button.
