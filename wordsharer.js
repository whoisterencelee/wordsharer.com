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
	repo.req('POST',U,null,function(e,text){
		if(e){C.innerHTML=errorlog("Unable to load "+W,e);return;}
	
		STAGED=repairHTML(marked(text),C);

		mergeWords();// setup atomic read / write

	},'raw');

}

var DOCHEAD="";
var STAGED="";

function getWords(file,cb){

	//get last commit for file
	repo.getCommits({path:file,sha:"heads/gh-pages",per_page:1},function(e,commits){
		if(e)return cb(errorlog("Unable to find last commit for "+file,e));
		var lastcommit=commits[0];

		//compare last commit sha with DOCHEAD if same return false, so won't trigger errorlogs and can test for sameness
		if(lastcommit.sha==DOCHEAD)return cb(false,STAGED);

		DOCHEAD=lastcommit.sha;
		
		//use lastcommit to get file
		repo.req("GET",lastcommit.commit.tree.url,null,function(e,tree){
			if(e)return cb(errorlog("Unable to find tree for commit "+lastcommit.sha,e));
			
			var blobobj = _.select(tree.tree, function(fileobj){return fileobj.path === file;})[0];

			repo.req("GET",blobobj.url,null,function(e,filecontent){
				if(e)return cb(errorlog("Unable to get file content of "+file+" @ commit "+lastcommit.sha,e));
				
				//put md thur markdown, because we are only working with HTML
				marked(filecontent,function(e,markup){
					if(e)return cb(errorlog("Unable to translate markdown/html to html ",e),null);

					cb(null,repairHTML(markup));

				});

			},'raw');
		});
	});
}

function mergeWords(cb){

	//2.5 way merge, there is only append no delete

	C.contenteditable=false;// lock up, when ever we are going to modify C, otherwise the user might see their modification disappear

	//convert any markdown first
	marked(C.innerHTML,function(e,MODIFIED){
		if(e){
			C.contenteditable=true;// unlock
			alert("The edits you entered caused a problem during markdown->html conversion, operation aborted : "+e);
			return;
		}

		// first diff last STAGED with modified to mark what's changed with <ins> <del> and re-instate deleted text
		// need MODIFIED to go thur the same process as STAGED so it as close as possible before diff, 
		STAGED=repairHTML(D.diff(STAGED,repairHTML(MODIFIED)),C);
		
		//TODO modify htmlDIFF to fix overlaping tags after diffs e.g. <ins><li></li><li></li></ins> should be <ins><li></li></ins> <ins><li></li></ins>

		//getWords and merge in
		getWords(W,function(change,REMOTE){
			if(change){
				C.contenteditable=true;// unlock
				alert("ERROR: Cannot merge REMOTE in. "+change);
				return;
			}

			if(change!=false)STAGED=repairHTML(D.diff(REMOTE,STAGED,{tagless:true}),C);// tagless so we won't get <ins><del></ins>, only merge text, the marks are already done
			//otherwise STAGED is already the latest

			C.contenteditable=true;// unlock

			if(typeof cb=='function')cb(null,STAGED);

		});

		//insert time modify attribute to all ins and del that doesn't already have this attribute
	});
}

function submitWords(){

	// lock submit button
	// write message which is only generated once

	mergeWords(function(){

		repo.write('gh-pages','why.md',STAGED,"commit changes to "+W+" using wordsharer",function(err){console.log(err)});

		// post blob first
			// build/post tree
			
		// get REPOHEAD not DOCHEAD
			// don't save REPOHEAD as DOCHEAD, it would mean an extra mergeWords, but the extra work makes sure you really have the latest
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

function errorlog(heading,details){
	console.log("ERROR: "+heading+" : "+details);
	return "<H1>"+heading+"</H1><P>"+details+"</P>";
}
