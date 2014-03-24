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

function wordsharer(words){

	gh=new Github({auth:'oauth',token:'b93365cb0876e6bf85728f3a10e2bab3384d428a'});//give personal access to repo, well repo is public anyways
	repo=gh.getRepo('whoisterencelee','wordsharer.com');
	C=document.getElementById('content');
	W=words;
	getWords(W,function(e,text){
		if(e)C.innerHTML=e;
		else C.innerHTML=text;
	});

	D=new htmlDiff;
	D.clearHash();  //needed, initialize html tag hash stores
	
}

function save(){
	
	repo.write('gh-pages','why.md',C.innerHTML,"commit changes to why.md",function(err){console.log(err)});

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

function getlatest(cb){
	repo.read('gh-pages','why.md',cb);
	// function(err, data) {});

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
					ORIGHTML=htmltext;

					cb(null,ORIGHTML);
				});

			},'raw');
		});
	});
}

function mergeWords(){

	//2.5 way merge

	//convert any markdown first
	marked(C.innerHTML,function(e,newhtml){
		if(e){
			alert("The edits you entered caused a problem during markdown->html conversion, changes not submitted");
			return;
		}

		//first merge original into current to see mark what's changed with <ins> <del> and re-instate deleted text
		//everyone does this so merging other's work later won't need to do this, this is what I mean by 2.5 way
		var M1=D.diff(ORIGHTML,newhtml);

		//getWords and merge in
		getWords(W,function(change,latest){
			if(change){alert("ERROR: Cannot merge latest in, changes not submitted "+change);return;}

			if(change===false)M2=M1;//no change, no need to diff
			else M2=D.diff(latest,M1,{tagless:true});//tagless so we won't get <ins><del></ins>, only merge text, the marks are already done

			C.innerHTML=M2;//display it to user anyways, because there might be new updates
			ORIGHTML=M2;//needed this if there's above line, because even if below fails, you might merge again, and you don't want to double mark your changes

			//write commit
			save();//TODO to be replace with atomic commit
		});

		//insert time modify attribute to all ins and del that doesn't already have this attribute
	});
}

function errorlog(heading,details){
	console.log("ERROR: "+heading+" : "+details);
	return "<H1>"+heading+"</H1><P>"+details+"</P>";
}
