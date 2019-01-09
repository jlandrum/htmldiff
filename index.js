#!/usr/bin/env node

const { exec } = require('child_process');
const { inspect } = require('util');
require('colors');

function getGroups(source) {
	var groups = [];

	source.split('diff --git ').forEach( (it) => { 
		let lines = it.split('\n');
		let name = lines[0].split(' ')[0].substr(2);
		let changes = getChanges(lines.slice(1));
		if (name) {
			groups.push({
				name: name,
				changes: changes
			});
		}
	});

	return groups;
}

function getChanges(input) {
	var changes = [];
	var lineHeader = null;
	var added = [];
	var removed = [];

	input.forEach( (it) => {
		if (it.startsWith('@') || it === '') {
			if (lineHeader != null) {
				changes.push({
					header: lineHeader,
					added: added,
					removed: removed
				});
			}

			lineHeader = it.substr(3,it.length-6);
			added = [];
			removed = [];
		} else if (it.startsWith('+')) {
			added.push(it.substr(1).replace('\t','  '));
		} else if (it.startsWith('-')) {
			removed.push(it.substr(1).replace('\t', '  '));
		}
	});

	return changes.filter( (it) => ( 
		(it.added.toString() + it.removed.toString()).indexOf('class=') >= 0 ||
		(it.added.toString() + it.removed.toString()).indexOf('id=') >= 0
	));
}

exec(`git --no-pager diff ${process.argv[2]||'HEAD~2'} ${process.argv[3]||'HEAD'} --diff-filter=M -U0 -- '*.html' | grep -i -P '^- |^\\+ |^diff|@@'`, 
	(err, stdout, stderr) => {
		if (err) {
			console.log('diff failed. Check that git is installed properly and you are in a repo.');
			return;
		}
		getGroups(stdout).forEach( (it) => {
			if (it.changes.length == 0) return;
			console.log(`Showing changes for ${it.name}`.green);
			it.changes.forEach( (group) => {
				console.log(`Lines: ${group.header}`.grey);
				console.log(`Added:`.green);
				group.added.forEach( (it) => console.log(it) );
				console.log(`Removed:`.red);
				group.removed.forEach( (it) => console.log(it) );
				console.log('');
			});
		});
	});
