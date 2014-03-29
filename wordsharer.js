// wordsharer.js - speedy, concise, propagate. Frictionless idea sharing powered by GitHub.
// Copyright (c) 2014, Terence Lee
// https://github.com/whoisterencelee/wordsharer.com.git

// requires:
// marked.js		https://github.com/chjj/marked.git
// github.js		https://github.com/whoisterencelee/github.git
//  underscore.js
//  base64.js
// htmlDiff		https://github.com/cosmiclattes/htmlDiff.git
//  google-diff-match-patch

function wordsharer(words,options){
	opt={repairHTML:1};// defaults
	for(var o in options){opt[o]=options[o];};

	gh=new Github({auth:'oauth',token:'b93365cb0876e6bf85728f3a10e2bab3384d428a'});//give personal access to repo, well repo is public anyways
	repo=gh.getRepo('whoisterencelee','wordsharer.com');
	C=document.getElementById('content');
	CC=C.cloneNode();//borrow node C's innerHTML to be repeatly used in repairHTML
	W=words;
	U='.//'+W;// allows offline file load

	D=new htmlDiff;
	D.clearHash();  // needed, initialize html tag hash stores

	if(opt.repairHTML==0){ //used marked repair only
		repairHTML=function(html,node){
			if(typeof node=='object')node.innerHTML=html;// for display only
			return html; // return html flavor based on escaped HTML output
		};
	}else if(opt.repairHTML==1){ //use browser innerHTML
		repairHTML=function(html,node){
			if(typeof node=='undefined')node=CC;
			node.innerHTML=html;// follow with innerHTML transform
			return node.innerHTML;// return html flavor based on displayable non-escaped html
		};
	}else{  //TODO use some sort of htmlParser and a stack to fix tag soup
		repairHTML=function(html,node){
			if(typeof node=='undefined')node=CC;
			node.innerHTML=html;// follow with innerHTML transform
			return node.innerHTML;// return html flavor based on displayable non-escaped html
		};
	};

	// borrow repo.req to quickly load the content first, not worry about atomic commits
	repo.req('GET',U,null,function(e,text){
		if(e){C.innerHTML=errorlog("Unable to load "+W,e);return;}
	
		STAGED=repairHTML(marked(text),C);

		mergeWords();// setup atomic read / write

	},'raw');

}

var DOCSHA="";
var STAGED="";

function getWords(file,cb){
	// this function can provide async so calling functions wont have to

	repo.getSha('gh-pages',file, function(e,sha){
		if(e){return cb(errorlog("getWords","unable to get file "+file+" from branch gh-pages"),STAGED);}
		var pulled=null;// tristate: (1) null (pulled) or (2) false (not pulled) or (3) true/string (error)
		if(sha==DOCSHA){pulled=false;return cb(pulled,STAGED);}
		DOCSHA=sha;
		repo.getBlob(sha,function(e,filecontent){
			if(e){return cb(errorlog("getWords","unable to get filecontent from "+sha),STAGED);}
			marked(filecontent,function(e,markup){// put md thur markdown, because we are only working with HTML
				if(e){return cb(errorlog("getWords","marked crash on parsing "+file),STAGED);}
				cb(pulled,repairHTML(markup));
			});
		});
	});
}

function mergeWords(cb){

	// 2.5 way merge, there is only append no delete
	// we can merge and not submit to provide preview

	C.contentEditable=false;// lock up, when ever we are going to modify C, otherwise the user might see their modification disappear

	//convert any markdown first
	marked(C.innerHTML,function(e,MODIFIED){
		if(e){
			C.contentEditable=true;// unlock
			alert("The edits you entered caused a problem during markdown->html conversion, operation aborted : "+e);
			return cb(e);
		}

		// first diff last STAGED with modified to mark what's changed with <ins> <del> and re-instate deleted text
		// need MODIFIED to go thur the same process as STAGED so it as close as possible before diff, 
		STAGED=repairHTML(D.diff(STAGED,repairHTML(MODIFIED)),C);
		
		// TODO modify htmlDIFF to fix overlaping tags after diffs e.g. <ins><li></li><li></li></ins> should be <ins><li></li></ins> <ins><li></li></ins>
		// TODO insert time modify attribute to all ins and del that doesn't already have this attribute

		//getWords and merge in
		getWords(W,function(pulled,REMOTE){
			var error=pulled;
			if(error){
				C.contentEditable=true;// unlock
				alert("ERROR: Cannot merge REMOTE in. "+error);
				return cb(error);
			}

			if(pulled===null)STAGED=repairHTML(D.diff(REMOTE,STAGED,{tagless:true}),C);
			// otherwise STAGED is already the latest
			// tagless so we won't get <ins><del></ins>, only merge text, the marks are already done

			if(typeof cb=='function')cb(pulled,STAGED);
			C.contentEditable=true;// unlock

		});

	});
}

MAXRETRIES=4;
REPOHEAD="";

function submitWords(retries){
	if(typeof retries=='undefined')retries=MAXRETRIES;

	// TODO fire and forget, user submit and even if there are new edits we try to save what's previously submitted
	// but things get complicated, for example, do you show remote updates once your fire and forget?
	// submit-merge-edit--------merge
	//         `-trying to save-merge
	// these final merges are different
	// to do this need to separate mergeWords into stageWords and mergeWords, 
	// if submit again, cancel previous non finished submit TODO implement queue

	// lock submit button
	// write commit message which is only generated once

	mergeWords(function(e,newwords){

		repo.postBlob(newwords,function(e,blob){
			if(e){return cb(errorlog("submitWords",e);return;};

			repo.updateTree(HEAD,W,blob,function(e,tree){
				if(e){return cb(errorlog("submitWords",e);return;};

				repo.commit(HEAD,tree,message,function(e,commit){
					if(e){return cb(errorlog("submitWords",e);return;};

					HEAD=commit;

				});
			});
		});
	});


	//OT version
	//diff the original md with current to get the client insert operation(s)
		//if content is removed, insert ~~strikeover~~ to convert to insert operation

	//grab the server insert operation from github, using something like git compare
		//save the current HEAD

	//transform the client insert operation and merge into the latest document
	//commit
		//if successful save the current HEAD
		//otherwise try from grab the 
}

function publishWords(){
	//TODO should sanitize C.innerHTML first
	var validhtml="<!DOCTYPE html><html><head></head>"+C.innerHTML+"</html>";
	repo.write('gh-pages','why-published.html',validhtml,"publish "+W+" to "+W+".html using wordsharer",function(){});
}

function errorlog(heading,details){
	var s="ERROR: "+heading+" : "+details;
	console.log(s);
	return s;
}
