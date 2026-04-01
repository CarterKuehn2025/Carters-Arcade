#include <iostream>
#include <string>
#include <map>
#include <vector>
using namespace std;

int longestSubstring(const string& s, int k) {
// map for storing char count
	map<char, int> charCount;
// vector for storing substrings
	vector<string> substrings;
// int for string manipulation, longest best substring, and valid substring
	int split = 0, bestSubstring = 0, validSubstring = 0;
// writing code comments from psuedo code
// best case - where k value is larger than entire string length, return 0
	if (s.size() < k) {
		return 0;
	}
// need to get frequency of each char (count # of times a char appears in a string)
// in c++, map may be the best option to count chars, I did a leetcode problem not too long ago
// where I had to do a char count from a string input
// loop through string s using a shorthand iterator
	for (char c : s) {
// ++ will iterate the integer stored at each key (char)
		charCount[c]++;
	}

// now to loop through each char in string s
	for (char c : s) {
// if a char within charCount appears less than k frequency, it is our "bad" char
		if (charCount[c] < k) {
			char badChar = c;
// need to split string into substrings based on bad char, utilizing "divide" from divide and conquer
// realizing it would've been easier to do this in python than c++ but oh well alreadly this far in
// for loop needs to iterate over size of string
			for (int i = 0; i < s.size(); i++) {
// if char at string index is a bad char, split the string but needs to use i - start to not clip edges of string/duplicate chars
				if (s[i] == badChar) {
					if (i - split > 0) {
// add split string to vector using pushback
						substrings.push_back(s.substr(split, i - split));
					}
// update split index
					split = i + 1;
				}
			}
// method above does not collect the tail substring after the last badchar, need to wrap up the lose end
// I think my logic is sound but we will see
			if (split < s.size()) {
				substrings.push_back(s.substr(split));
			}

// now to recursively "search" each substring and keep track of the longest valid length
// for loop to iterate through each substring inside of substrings vector
			for (const auto& substring : substrings) {
				int validSubstring = longestSubstring(substring, k);
// max returns the greatest int between the two
				bestSubstring = max(bestSubstring, validSubstring);
			}

			return bestSubstring;
		}
	}
// final case, if loop if exited, then all characters have a frequency higher than k, meaning the entire string is valid
	return s.size();
}



int main() {
// variables
	string s = " ";
	int k = 0;
	int result = 0;
// input from user, simple getline for string and integer for char frequency
	cout << "Please input the string you would like to parse: " << endl;
	getline(cin, s);
	cout << "Please input an integer for the frequency of chars: " << endl;
	cin >> k;

	result = longestSubstring(s, k);
	cout << "Longest valid substring length = " << result << endl;
	return 0;
}