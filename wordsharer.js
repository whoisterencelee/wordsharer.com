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
	opt={store_human_readable_html:true};// defaults
	for(var o in options){opt[o]=options[o];};

	gh=new Github({auth:'oauth',token:'b93365cb0876e6bf85728f3a10e2bab3384d428a'});//give personal access to repo, well repo is public anyways
	repo=gh.getRepo('whoisterencelee','wordsharer.com');
	C=document.getElementById('content');
	CC=C.cloneNode();//borrow node C's innerHTML to be repeatly used in markup
	W=words;
	U='.//'+W;

	D=new htmlDiff;
	D.clearHash();  // needed, initialize html tag hash stores

	if(opt.store_human_readable_html){
		markup=function(html,node){
			if(typeof node=='undefined')node=CC;
			node.innerHTML=html;// follow with innerHTML transform
			return node.innerHTML;// return html flavor based on displayable non-escaped html
		};
	}else{
		markup=function(html,node){
			if(typeof node=='object')node.innerHTML=html;// for display only
			return html; // return html flavor based on escaped HTML output
		};
	}

	// borrow repo.req to quickly load the content first, not worry about atomic commits
	repo.req('GET',U,null,function(e,text){
		if(e){C.innerHTML=errorlog("Unable to load "+W,e);return;}
	
		ORIGHTML=markup(marked(text),C);

		mergeWords();// setup atomic read / write

	},'raw');

}

var DOCHEAD="";
var ORIGHTML="";

function getWords(file,cb){

	//get last commit for file
	repo.getCommits({path:file,sha:"heads/gh-pages",per_page:1},function(e,commits){
		if(e)return cb(errorlog("Unable to find last commit for "+file,e));
		var lastcommit=commits[0];

		//compare last commit sha with DOCHEAD if same return false, so won't trigger errorlogs and can test for sameness
		if(lastcommit.sha==DOCHEAD)return cb(false,ORIGHTML);

		DOCHEAD=lastcommit.sha;
		
		//use lastcommit to get file
		repo.req("GET",lastcommit.commit.tree.url,null,function(e,tree){
			if(e)return cb(errorlog("Unable to find tree for commit "+lastcommit.sha,e));
			
			var blobobj = _.select(tree.tree, function(fileobj){return fileobj.path === file;})[0];

			repo.req("GET",blobobj.url,null,function(e,filecontent){
				if(e)return cb(errorlog("Unable to get file content of "+file+" @ commit "+lastcommit.sha,e));
				
				//put md thur markdown, because we are only working with HTML
				marked(filecontent,function(e,htmltext){
					if(e)return cb(errorlog("Unable to translate markdown/html to html ",e),null);

					//save html as original version
					ORIGHTML=markup(htmltext);//borrow CC innerHTML because we don't necessary display htmltext, but might need to transform

					cb(null,ORIGHTML);
				});

			},'raw');
		});
	});
}

function mergeWords(cb){

	//2.5 way merge

	//convert any markdown first
	marked(C.innerHTML,function(e,M1){
		if(e){
			alert("The edits you entered caused a problem during markdown->html conversion, changes not submitted : "+e);
			return;
		}

		//first merge original into current to see mark what's changed with <ins> <del> and re-instate deleted text
		//everyone does this so merging other's work later won't need to do this, this is what I mean by 2.5 way
		var M2=D.diff(ORIGHTML,markup(M1));
		
		//TODO attempt to fix overlaping tags after diffs e.g. <ins><li></li><li></li></ins> should be <ins><li></li></ins> <ins><li></li></ins>

		//getWords and merge in
		getWords(W,function(change,latest){
			if(change){alert("ERROR: Cannot merge latest in, changes not submitted "+change);return;}

			if(change===false)M3=M2;//no change, no need to diff
			else M3=D.diff(latest,M2,{tagless:true});//tagless so we won't get <ins><del></ins>, only merge text, the marks are already done

			ORIGHTML=markup(M3,C);// needed this because even if below fails, you might merge again, and you don't want to double mark your changes

			if(typeof cb=='function')cb(null,ORIGHTML);

		});

		//insert time modify attribute to all ins and del that doesn't already have this attribute
	});
}

function submitWords(){

	mergeWords(function(){
		repo.write('gh-pages','why.md',markup(marked(C.innerHTML)),"commit changes to why.md",function(err){console.log(err)});
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
